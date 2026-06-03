import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "fixtures" / "amazon-human"
SEED_ROOT = ROOT / "seed"
LEGACY_BATCH_ROOT = ROOT / "batches"

REQUIRED_STATUS = {"generated", "reviewed", "approved"}
REQUIRED_SENTIMENT = {"positive", "neutral", "negative"}
REQUIRED_GENDERS = {"female", "male", "nonbinary", "prefer_not_to_say"}
REQUIRED_BODY_TYPES = {"petite", "slim", "average", "curvy", "athletic", "broad_shoulders", "tall", "plus"}
REQUIRED_FIT_RESULTS = {
    "too_small",
    "slightly_small",
    "true_to_size",
    "slightly_large",
    "too_large",
    "varies_by_body_type",
}
REQUIRED_ISSUES = {
    "none",
    "sizing_issue",
    "too_heavy",
    "too_thin",
    "too_warm",
    "not_breathable",
    "scratchy_material",
    "color_mismatch",
    "wrinkles_easily",
    "hard_to_wash",
    "shrinks_after_wash",
    "weak_durability",
    "not_waterproof_enough",
    "poor_value_for_price",
    "uncomfortable_fit",
    "pilling",
    "odor_issue",
    "transparent_fabric",
    "strap_discomfort",
    "poor_arch_support",
    "slippery_sole",
    "zipper_issue",
    "insufficient_storage",
    "see_through",
    "length_issue",
}
FASHION_CATEGORIES = {
    "Outerwear",
    "Tops",
    "Bottoms",
    "Dresses",
    "Footwear",
    "Footwears",
    "Bags",
    "Accessories",
}
V3_CATEGORY_TARGETS = {
    "Outerwear": 70,
    "Tops": 70,
    "Bottoms": 65,
    "Dresses": 45,
    "Footwear": 65,
    "Bags": 45,
    "Accessories": 60,
}
V4_TARGET_PRODUCTS = 1680
NON_APPAREL_CONTEXT = {
    "Footwear": re.compile(r"\b(sleeve|armhole|lapel|bodice|waistband|inseam|hemline|upper body)\b|소매|암홀|상체", re.IGNORECASE),
    "Bags": re.compile(r"\b(sleeve|armhole|lapel|bodice|waistband|inseam|toe box|arch support|sole)\b|소매|암홀|상체|신발", re.IGNORECASE),
    "Accessories": re.compile(r"\b(sleeve|armhole|lapel|bodice|waistband|inseam|toe box|arch support|sole)\b|소매|암홀|상체|신발", re.IGNORECASE),
}
IMAGE_URL = re.compile(r"^https?://", re.IGNORECASE)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fail(errors, message):
    errors.append(message)


def is_valid_image_url(value):
    return isinstance(value, str) and bool(IMAGE_URL.match(value.strip()))


def select_batch_files():
    batch_root = SEED_ROOT if SEED_ROOT.exists() else LEGACY_BATCH_ROOT
    all_files = sorted(batch_root.glob("batch-*.json"))
    v3_files = sorted(batch_root.glob("batch-v3-*.json"))
    v4_files = sorted(batch_root.glob("batch-v4-*.json"))
    if v4_files:
        return sorted([*v3_files, *v4_files]), False, True
    if v3_files:
        return v3_files, True, False
    return [path for path in all_files if not path.name.startswith("batch-src-op-")], False, False


def expected_rating_detail(product_reviews):
    total = len(product_reviews)
    counts = Counter(str(int(review.get("rating", 0))) for review in product_reviews)
    raw = {str(value): (counts[str(value)] / total) * 100 for value in range(1, 6)}
    percentages = {key: int(raw[key]) for key in raw}
    remainder = 100 - sum(percentages.values())
    fractions = sorted(raw, key=lambda key: raw[key] - percentages[key], reverse=True)
    for key in fractions[:remainder]:
        percentages[key] += 1
    return percentages


def validate_product(product, definitions, options, errors):
    product_id = product.get("id")
    if product.get("category") not in FASHION_CATEGORIES:
        fail(errors, f"Product {product_id} has non-fashion category {product.get('category')}.")

    if not is_valid_image_url(product.get("img")):
        fail(errors, f"Product {product_id} is missing a valid primary image URL.")

    for field in ("descImages", "brandImages"):
        urls = product.get(field)
        if not isinstance(urls, list) or not urls:
            fail(errors, f"Product {product_id} is missing {field}.")
            continue
        invalid_urls = [url for url in urls if not is_valid_image_url(url)]
        if invalid_urls:
            fail(errors, f"Product {product_id} has invalid {field} URL(s): {len(invalid_urls)}.")

    attributes = product.get("attributes", {})
    missing = sorted(set(definitions) - set(attributes))
    if missing:
        fail(errors, f"Product {product_id} missing attributes: {', '.join(missing)}.")

    total = sum(int(product.get("ratingDetail", {}).get(str(value), 0)) for value in range(1, 6))
    if total != 100:
        fail(errors, f"Product {product_id} ratingDetail sums to {total}.")
    for value in range(1, 6):
        percentage = int(product.get("ratingDetail", {}).get(str(value), -1))
        if percentage < 0 or percentage > 100:
            fail(errors, f"Product {product_id} ratingDetail[{value}] is out of range: {percentage}.")

    for key, value in attributes.items():
        definition = definitions.get(key)
        if not definition:
            fail(errors, f"Product {product_id} has unknown attribute {key}.")
            continue
        if definition["dataType"] == "enum" and value not in options[key]:
            fail(errors, f"Product {product_id} invalid enum {key}={value}.")
        if definition["dataType"] == "number":
            if not isinstance(value, (int, float)):
                fail(errors, f"Product {product_id} non-number {key}.")
                continue
            if value < definition["minValue"] or value > definition["maxValue"]:
                fail(errors, f"Product {product_id} out-of-range {key}={value}.")
        if definition["dataType"] == "boolean" and not isinstance(value, bool):
            fail(errors, f"Product {product_id} non-boolean {key}.")


def main():
    errors = []
    taxonomy = load_json(ROOT / "attribute_taxonomy.json")
    definitions = {item["key"]: item for item in taxonomy}
    options = {
        item["key"]: {option["value"] for option in item.get("options", [])}
        for item in taxonomy
        if item["dataType"] == "enum"
    }

    products = []
    reviews = []
    profiles = []
    evidence = []
    batch_files, is_v3, is_v4 = select_batch_files()
    if not batch_files:
        fail(errors, "No batch files found.")

    for batch_file in batch_files:
        batch = load_json(batch_file)
        products.extend(batch.get("products", []))
        reviews.extend(batch.get("reviews", []))
        profiles.extend(batch.get("reviewProfiles", []))
        evidence.extend(batch.get("reviewEvidence", []))

    product_ids = set()
    products_by_id = {}
    for product in products:
        product_id = product.get("id")
        if product_id in product_ids:
            fail(errors, f"Duplicate product id {product_id}.")
        product_ids.add(product_id)
        products_by_id[product_id] = product
        validate_product(product, definitions, options, errors)

    review_ids = set()
    reviews_by_id = {}
    reviews_by_product = defaultdict(list)
    review_bodies = Counter()
    review_titles = Counter()
    for review in reviews:
        review_id = review.get("id")
        product_id = review.get("productId")
        if review_id in review_ids:
            fail(errors, f"Duplicate review id {review_id}.")
        review_ids.add(review_id)
        reviews_by_id[review_id] = review
        if product_id not in product_ids:
            fail(errors, f"Review {review_id} references missing product {product_id}.")
        reviews_by_product[product_id].append(review)
        rating = int(review.get("rating", 0))
        if rating < 1 or rating > 5:
            fail(errors, f"Review {review_id} invalid rating.")
        if len([part for part in review.get("comment", "").split(".") if part.strip()]) < 2:
            fail(errors, f"Review {review_id} is too short for human-authored data.")
        if int(review.get("helpfulVotes", 0)) < 0:
            fail(errors, f"Review {review_id} has negative helpfulVotes.")
        if int(review.get("reviewImagesCount", 0)) < 0:
            fail(errors, f"Review {review_id} has negative reviewImagesCount.")
        review_bodies[review.get("comment", "")] += 1
        review_titles[review.get("title", "")] += 1

        product = products_by_id.get(product_id)
        if product:
            pattern = NON_APPAREL_CONTEXT.get(product.get("category"))
            if pattern and pattern.search(f"{review.get('title', '')} {review.get('comment', '')}"):
                fail(errors, f"Review {review_id} has category-context mismatch for {product.get('category')}.")

    profile_ids = set()
    profile_body_types = Counter()
    for profile in profiles:
        review_id = profile.get("reviewId")
        if review_id not in review_ids:
            fail(errors, f"Profile references missing review {review_id}.")
        if review_id in profile_ids:
            fail(errors, f"Duplicate profile for review {review_id}.")
        profile_ids.add(review_id)
        if profile.get("gender") not in REQUIRED_GENDERS:
            fail(errors, f"Profile for review {review_id} has invalid gender {profile.get('gender')}.")
        if profile.get("bodyType") not in REQUIRED_BODY_TYPES:
            fail(errors, f"Profile for review {review_id} has invalid bodyType {profile.get('bodyType')}.")
        if profile.get("fitResult") not in REQUIRED_FIT_RESULTS:
            fail(errors, f"Profile for review {review_id} has invalid fitResult {profile.get('fitResult')}.")
        height_cm = profile.get("heightCm")
        if not isinstance(height_cm, int) or height_cm < 140 or height_cm > 210:
            fail(errors, f"Profile for review {review_id} has invalid heightCm {height_cm}.")
        profile_body_types[profile.get("bodyType")] += 1
    if review_ids - profile_ids:
        fail(errors, f"{len(review_ids - profile_ids)} reviews missing profiles.")

    evidence_ids = set()
    evidence_by_review = Counter()
    evidence_texts = Counter()
    negative_issue_by_product = defaultdict(Counter)
    negative_attribute_by_product = defaultdict(Counter)
    typed_fields = ("evidenceValueText", "evidenceValueNumber", "evidenceValueBoolean")
    for item in evidence:
        evidence_id = item.get("id")
        review_id = item.get("reviewId")
        product_id = item.get("productId")
        if evidence_id in evidence_ids:
            fail(errors, f"Duplicate evidence id {evidence_id}.")
        evidence_ids.add(evidence_id)
        if review_id not in review_ids:
            fail(errors, f"Evidence {evidence_id} references missing review {review_id}.")
        if product_id not in product_ids:
            fail(errors, f"Evidence {evidence_id} references missing product {product_id}.")
        if item.get("attributeKey") not in definitions:
            fail(errors, f"Evidence {evidence_id} references unknown attribute {item.get('attributeKey')}.")
        sentiment = item.get("sentiment")
        issue_type = item.get("issueType", "none")
        if sentiment not in REQUIRED_SENTIMENT:
            fail(errors, f"Evidence {evidence_id} invalid sentiment.")
        if issue_type not in REQUIRED_ISSUES:
            fail(errors, f"Evidence {evidence_id} invalid issueType.")
        if sentiment == "negative" and issue_type == "none":
            fail(errors, f"Evidence {evidence_id} is negative but issueType is none.")
        if sentiment != "negative" and issue_type != "none":
            fail(errors, f"Evidence {evidence_id} is not negative but issueType is {issue_type}.")
        if sentiment == "negative":
            negative_issue_by_product[product_id][issue_type] += 1
            negative_attribute_by_product[product_id][item.get("attributeKey")] += 1
        if item.get("humanReviewStatus") not in REQUIRED_STATUS:
            fail(errors, f"Evidence {evidence_id} invalid humanReviewStatus.")
        if int(item.get("severity", -1)) < 0 or int(item.get("severity", -1)) > 5:
            fail(errors, f"Evidence {evidence_id} invalid severity.")
        if sum(1 for key in typed_fields if key in item) > 1:
            fail(errors, f"Evidence {evidence_id} has multiple typed values.")
        text = item.get("evidenceText", "")
        comment = reviews_by_id.get(review_id, {}).get("comment", "")
        if text not in comment:
            fail(errors, f"Evidence {evidence_id} text is not in review {review_id}.")
        evidence_by_review[review_id] += 1
        evidence_texts[text] += 1

    for product in products:
        product_id = product.get("id")
        product_reviews = reviews_by_product.get(product_id, [])
        if len(product_reviews) < 5:
            fail(errors, f"Product {product_id} has fewer than 5 reviews.")
            continue
        if (is_v3 or is_v4) and len(product_reviews) > 80:
            fail(errors, f"Product {product_id} has more than 80 reviews.")
        expected_review_count = len(product_reviews)
        if int(product.get("reviewCount", 0)) != expected_review_count:
            fail(errors, f"Product {product_id} reviewCount does not match reviews: {product.get('reviewCount')} != {expected_review_count}.")
        expected_rating = round(sum(int(review.get("rating", 0)) for review in product_reviews) / expected_review_count, 1)
        if round(float(product.get("rating", 0)), 1) != expected_rating:
            fail(errors, f"Product {product_id} rating does not match reviews: {product.get('rating')} != {expected_rating}.")
        expected_detail = expected_rating_detail(product_reviews)
        for value in range(1, 6):
            actual = int(product.get("ratingDetail", {}).get(str(value), -1))
            expected = expected_detail[str(value)]
            if actual != expected:
                fail(errors, f"Product {product_id} ratingDetail[{value}] does not match reviews: {actual} != {expected}.")

    if is_v3:
        if len(products) != 420:
            fail(errors, f"v3 product count must be 420, got {len(products)}.")
        if len(reviews) < 8000 or len(reviews) > 12000:
            fail(errors, f"v3 review count must be between 8000 and 12000, got {len(reviews)}.")
        if len(evidence) < 40000:
            fail(errors, f"v3 evidence count must be at least 40000, got {len(evidence)}.")
        category_counts = Counter(product.get("category") for product in products)
        for category, expected in V3_CATEGORY_TARGETS.items():
            if category_counts[category] != expected:
                fail(errors, f"v3 category {category} count must be {expected}, got {category_counts[category]}.")

    if is_v4:
        if len(products) < 420:
            fail(errors, f"v4 cumulative seed must keep the existing v3 baseline, got {len(products)} products.")
        if os.environ.get("AMAZON_V4_REQUIRE_FINAL") == "1" and len(products) < V4_TARGET_PRODUCTS:
            fail(errors, f"v4 final product count must be at least {V4_TARGET_PRODUCTS}, got {len(products)}.")

    if is_v3 or is_v4:
        for review_id in review_ids:
            count = evidence_by_review[review_id]
            if count < 2 or count > 8:
                fail(errors, f"Review {review_id} has {count} evidence rows; active seed requires 2..8.")
        average_evidence = len(evidence) / max(1, len(reviews))
        if average_evidence < 5:
            fail(errors, f"active seed average evidence per review must be at least 5, got {average_evidence:.2f}.")
        duplicate_bodies = [body for body, count in review_bodies.items() if count > 1]
        if duplicate_bodies:
            fail(errors, f"active seed duplicate review body count must be 0, got {len(duplicate_bodies)}.")
        repeated_titles = [title for title, count in review_titles.items() if count > 3]
        if repeated_titles:
            fail(errors, f"active seed review titles repeated more than 3 times: {len(repeated_titles)} title(s).")
        repeated_evidence = [text for text, count in evidence_texts.items() if count > 20]
        if repeated_evidence:
            fail(errors, f"active seed evidence text repeated more than 20 times: {len(repeated_evidence)} snippet(s).")
        product_average_rating = sum(float(product.get("rating", 0)) for product in products) / max(1, len(products))
        if product_average_rating < 3.65:
            fail(errors, f"active seed average product rating must be at least 3.65, got {product_average_rating:.2f}.")
        high_rating_products = sum(1 for product in products if float(product.get("rating", 0)) >= 4.0)
        if high_rating_products < 110:
            fail(errors, f"active seed products rated 4.0+ must be at least 110, got {high_rating_products}.")
        positive_review_count = sum(1 for review in reviews if int(review.get("rating", 0)) >= 4)
        positive_review_ratio = positive_review_count / max(1, len(reviews))
        if positive_review_ratio < 0.62:
            fail(errors, f"active seed 4-5 star review ratio must be at least 62%, got {positive_review_ratio:.2%}.")
        for body_type, minimum_ratio in {"petite": 0.14, "tall": 0.08, "plus": 0.07}.items():
            ratio = profile_body_types[body_type] / max(1, len(profiles))
            if ratio < minimum_ratio:
                fail(errors, f"active seed {body_type} profile ratio must be at least {minimum_ratio:.0%}, got {ratio:.2%}.")
        weak_clusters = []
        diverse_issue_products = []
        overconcentrated_products = []
        for product_id, issue_counts in negative_issue_by_product.items():
            total_negative = sum(issue_counts.values())
            if total_negative < 12:
                continue
            product = products_by_id.get(product_id, {})
            pattern = product.get("qualityProfile", {}).get("marketPattern", "steady_catalog")
            top_three = sum(count for _, count in issue_counts.most_common(3))
            top_issue = issue_counts.most_common(1)[0][1]
            top_issue_share = top_issue / total_negative
            top_three_share = top_three / total_negative
            minimum_top_three_share = 0.42 if pattern == "polarizing_fit" else 0.52
            if top_three_share < minimum_top_three_share:
                weak_clusters.append(product_id)
            if top_issue_share <= 0.72:
                diverse_issue_products.append(product_id)
            if top_issue_share > 0.92:
                overconcentrated_products.append(product_id)
        if weak_clusters:
            fail(errors, f"active seed negative issue clustering is too diffuse for {len(weak_clusters)} product(s).")
        if len(diverse_issue_products) < 40:
            fail(errors, f"active seed diverse issue products must be at least 40, got {len(diverse_issue_products)}.")
        if len(overconcentrated_products) > 25:
            fail(errors, f"active seed overconcentrated issue products must be at most 25, got {len(overconcentrated_products)}.")
        products_with_no_negative = sum(
            1
            for product in products
            if sum(negative_issue_by_product.get(product.get("id"), {}).values()) == 0
        )
        if products_with_no_negative < 8:
            fail(errors, f"active seed products with no negative evidence must be at least 8, got {products_with_no_negative}.")
        if products_with_no_negative > 35:
            fail(errors, f"active seed products with no negative evidence must be at most 35, got {products_with_no_negative}.")
        high_rating_low_review = sum(
            1
            for product in products
            if float(product.get("rating", 0)) >= 4.3 and len(reviews_by_product.get(product.get("id"), [])) <= 7
        )
        if high_rating_low_review < 15:
            fail(errors, f"active seed high-rating low-review products must be at least 15, got {high_rating_low_review}.")
        high_rating_with_complaints = sum(
            1
            for product in products
            if float(product.get("rating", 0)) >= 4.2
            and sum(negative_issue_by_product.get(product.get("id"), {}).values()) >= 3
        )
        if high_rating_with_complaints < 80:
            fail(errors, f"active seed high-rating products with complaint evidence must be at least 80, got {high_rating_with_complaints}.")

    if errors:
        print("Validation failed:")
        for error in errors[:120]:
            print(f"- {error}")
        if len(errors) > 120:
            print(f"...and {len(errors) - 120} more errors.")
        raise SystemExit(1)

    if is_v4:
        print(f"V4 cumulative progress: {len(products)} / {V4_TARGET_PRODUCTS} products.")

    print(
        f"Validated {len(batch_files)} batches, {len(products)} products, "
        f"{len(reviews)} reviews, {len(profiles)} profiles, and {len(evidence)} evidence rows."
    )


if __name__ == "__main__":
    main()
