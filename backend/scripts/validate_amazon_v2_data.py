import json
from collections import Counter, defaultdict
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = BACKEND_ROOT / "fixtures" / "amazon"

MIN_PRODUCTS = 400
MIN_REVIEWS = 10_000
MIN_EVIDENCE = 45_000
MIN_REVIEWS_PER_PRODUCT = 25
MIN_EVIDENCE_PER_REVIEW = 4
MIN_AVG_EVIDENCE_PER_REVIEW = 5
MIN_LOW_RATING_RATIO = 0.15
MIN_MIXED_RATING_RATIO = 0.20
MIN_NEGATIVE_EVIDENCE_RATIO = 0.30
MIN_NEUTRAL_EVIDENCE_RATIO = 0.15
MIN_NEGATIVE_ISSUE_PER_PRODUCT = 3

REQUIRED_STATUS = {"generated", "reviewed", "approved"}
REQUIRED_SENTIMENT = {"positive", "neutral", "negative"}
ISSUE_TYPES = {
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
}
GENDERS = {"female", "male", "nonbinary", "prefer_not_to_say"}
BODY_TYPES = {"petite", "slim", "average", "curvy", "athletic", "broad_shoulders", "tall", "plus"}
FIT_RESULTS = {"too_small", "slightly_small", "true_to_size", "slightly_large", "too_large", "varies_by_body_type"}


def load_json(name):
    return json.loads((FIXTURE_ROOT / name).read_text(encoding="utf-8"))


def fail(errors, message):
    errors.append(message)


def rating_detail_from_ratings(ratings):
    total = len(ratings)
    raw_counts = Counter(ratings)
    raw_percentages = {rating: raw_counts[rating] * 100 / total for rating in range(1, 6)}
    floors = {rating: int(raw_percentages[rating]) for rating in range(1, 6)}
    remainder = 100 - sum(floors.values())
    fractions = sorted(((raw_percentages[rating] - floors[rating], rating) for rating in range(1, 6)), reverse=True)
    for _, rating in fractions[:remainder]:
        floors[rating] += 1
    return {str(rating): floors[rating] for rating in range(1, 6)}


def main():
    errors = []
    products = load_json("products.json")
    reviews = load_json("review.json")
    profiles = load_json("review_profiles.json")
    taxonomy = load_json("attribute_taxonomy.json")
    evidence = load_json("review_evidence.json")

    definitions = {item["key"]: item for item in taxonomy}
    required_keys = set(definitions)
    option_values = {
        item["key"]: {option["value"] for option in item.get("options", [])}
        for item in taxonomy
        if item["dataType"] == "enum"
    }

    if len(products) < MIN_PRODUCTS:
        fail(errors, f"Product count is below {MIN_PRODUCTS}: {len(products)}.")
    if len(reviews) < MIN_REVIEWS:
        fail(errors, f"Review count is below {MIN_REVIEWS}: {len(reviews)}.")
    if len(evidence) < MIN_EVIDENCE:
        fail(errors, f"Evidence count is below {MIN_EVIDENCE}: {len(evidence)}.")

    product_ids = set()
    products_by_id = {}
    for product in products:
        product_id = product.get("id")
        if product_id in product_ids:
            fail(errors, f"Duplicate product id {product_id}.")
        product_ids.add(product_id)
        products_by_id[product_id] = product

        rating_total = sum(int(product.get("ratingDetail", {}).get(str(value), 0)) for value in range(1, 6))
        if rating_total != 100:
            fail(errors, f"Product {product_id} ratingDetail sums to {rating_total}.")

        attributes = product.get("attributes", {})
        missing = sorted(required_keys - set(attributes))
        if missing:
            fail(errors, f"Product {product_id} missing attributes: {', '.join(missing)}.")
        for key, value in attributes.items():
            definition = definitions.get(key)
            if not definition:
                fail(errors, f"Product {product_id} has unknown attribute {key}.")
                continue
            data_type = definition["dataType"]
            if data_type == "enum" and value not in option_values[key]:
                fail(errors, f"Product {product_id} has invalid enum {key}={value}.")
            elif data_type == "number":
                if not isinstance(value, (int, float)):
                    fail(errors, f"Product {product_id} has non-number {key}.")
                    continue
                if value < definition["minValue"] or value > definition["maxValue"]:
                    fail(errors, f"Product {product_id} has out-of-range {key}={value}.")
            elif data_type == "boolean" and not isinstance(value, bool):
                fail(errors, f"Product {product_id} has non-boolean {key}.")
            elif data_type == "text" and not isinstance(value, str):
                fail(errors, f"Product {product_id} has non-text {key}.")

    review_ids = set()
    reviews_by_id = {}
    reviews_by_product = defaultdict(list)
    rating_counts = Counter()
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
        if not 1 <= rating <= 5:
            fail(errors, f"Review {review_id} has invalid rating.")
        rating_counts[rating] += 1

    for product_id in product_ids:
        if len(reviews_by_product[product_id]) < MIN_REVIEWS_PER_PRODUCT:
            fail(errors, f"Product {product_id} has fewer than {MIN_REVIEWS_PER_PRODUCT} reviews.")
        review_ratings = [int(review["rating"]) for review in reviews_by_product[product_id]]
        if review_ratings:
            expected_rating = round(sum(review_ratings) / len(review_ratings), 1)
            actual_rating = round(float(products_by_id[product_id]["rating"]), 1)
            if expected_rating != actual_rating:
                fail(errors, f"Product {product_id} rating {actual_rating} does not match review average {expected_rating}.")
            expected_detail = rating_detail_from_ratings(review_ratings)
            if products_by_id[product_id].get("ratingDetail") != expected_detail:
                fail(errors, f"Product {product_id} ratingDetail does not match review distribution.")

    low_rating_ratio = (rating_counts[1] + rating_counts[2]) / len(reviews)
    mixed_rating_ratio = rating_counts[3] / len(reviews)
    if low_rating_ratio < MIN_LOW_RATING_RATIO:
        fail(errors, f"1-2 star review ratio is below {MIN_LOW_RATING_RATIO:.0%}: {low_rating_ratio:.1%}.")
    if mixed_rating_ratio < MIN_MIXED_RATING_RATIO:
        fail(errors, f"3 star review ratio is below {MIN_MIXED_RATING_RATIO:.0%}: {mixed_rating_ratio:.1%}.")

    profile_ids = set()
    for profile in profiles:
        review_id = profile.get("reviewId")
        if review_id not in review_ids:
            fail(errors, f"Profile references missing review {review_id}.")
        if review_id in profile_ids:
            fail(errors, f"Duplicate profile for review {review_id}.")
        profile_ids.add(review_id)
        if profile.get("gender") not in GENDERS:
            fail(errors, f"Profile {review_id} has invalid gender.")
        if profile.get("bodyType") not in BODY_TYPES:
            fail(errors, f"Profile {review_id} has invalid bodyType.")
        if profile.get("fitResult") not in FIT_RESULTS:
            fail(errors, f"Profile {review_id} has invalid fitResult.")
        height = int(profile.get("heightCm", 0))
        if height < 140 or height > 210:
            fail(errors, f"Profile {review_id} has invalid heightCm.")
        if not profile.get("usualSize") or not profile.get("purchasedSize"):
            fail(errors, f"Profile {review_id} is missing size fields.")
    missing_profiles = review_ids - profile_ids
    if missing_profiles:
        fail(errors, f"{len(missing_profiles)} reviews are missing review profiles.")

    evidence_by_review = defaultdict(int)
    negative_issues_by_product = defaultdict(int)
    sentiment_counts = Counter()
    evidence_ids = set()
    for item in evidence:
        evidence_id = item.get("id")
        review_id = item.get("reviewId")
        product_id = item.get("productId")
        attribute_key = item.get("attributeKey")
        sentiment = item.get("sentiment")
        issue_type = item.get("issueType", "none")
        if evidence_id in evidence_ids:
            fail(errors, f"Duplicate evidence id {evidence_id}.")
        evidence_ids.add(evidence_id)
        if review_id not in review_ids:
            fail(errors, f"Evidence {evidence_id} references missing review {review_id}.")
        if product_id not in product_ids:
            fail(errors, f"Evidence {evidence_id} references missing product {product_id}.")
        if attribute_key not in definitions:
            fail(errors, f"Evidence {evidence_id} references unknown attribute {attribute_key}.")
        if sentiment not in REQUIRED_SENTIMENT:
            fail(errors, f"Evidence {evidence_id} has invalid sentiment.")
        if issue_type not in ISSUE_TYPES:
            fail(errors, f"Evidence {evidence_id} has invalid issueType.")
        if item.get("humanReviewStatus") not in REQUIRED_STATUS:
            fail(errors, f"Evidence {evidence_id} has invalid humanReviewStatus.")
        severity = int(item.get("severity", -1))
        if severity < 0 or severity > 5:
            fail(errors, f"Evidence {evidence_id} has invalid severity.")
        if sentiment == "negative" and issue_type == "none":
            fail(errors, f"Evidence {evidence_id} is negative but issueType is none.")
        typed_values = [
            "evidenceValueText" in item,
            "evidenceValueNumber" in item,
            "evidenceValueBoolean" in item,
        ]
        if sum(typed_values) > 1:
            fail(errors, f"Evidence {evidence_id} has multiple typed values.")
        evidence_text = item.get("evidenceText")
        review = reviews_by_id.get(review_id)
        if not evidence_text:
            fail(errors, f"Evidence {evidence_id} is missing evidenceText.")
        elif review and evidence_text not in review.get("comment", ""):
            fail(errors, f"Evidence {evidence_id} text is not present in review body.")

        evidence_by_review[review_id] += 1
        sentiment_counts[sentiment] += 1
        if sentiment == "negative" and issue_type != "none":
            negative_issues_by_product[product_id] += 1

    for review_id in review_ids:
        if evidence_by_review[review_id] < MIN_EVIDENCE_PER_REVIEW:
            fail(errors, f"Review {review_id} has fewer than {MIN_EVIDENCE_PER_REVIEW} evidence rows.")
    average_evidence = sum(evidence_by_review.values()) / len(review_ids)
    if average_evidence < MIN_AVG_EVIDENCE_PER_REVIEW:
        fail(errors, f"Average evidence per review is below {MIN_AVG_EVIDENCE_PER_REVIEW}: {average_evidence:.2f}.")

    negative_ratio = sentiment_counts["negative"] / len(evidence)
    neutral_ratio = sentiment_counts["neutral"] / len(evidence)
    if negative_ratio < MIN_NEGATIVE_EVIDENCE_RATIO:
        fail(errors, f"Negative evidence ratio is below {MIN_NEGATIVE_EVIDENCE_RATIO:.0%}: {negative_ratio:.1%}.")
    if neutral_ratio < MIN_NEUTRAL_EVIDENCE_RATIO:
        fail(errors, f"Neutral evidence ratio is below {MIN_NEUTRAL_EVIDENCE_RATIO:.0%}: {neutral_ratio:.1%}.")

    for product_id in product_ids:
        if negative_issues_by_product[product_id] < MIN_NEGATIVE_ISSUE_PER_PRODUCT:
            fail(errors, f"Product {product_id} has fewer than {MIN_NEGATIVE_ISSUE_PER_PRODUCT} negative issue evidence rows.")

    if errors:
        print("Validation failed:")
        for error in errors[:80]:
            print(f"- {error}")
        if len(errors) > 80:
            print(f"...and {len(errors) - 80} more errors.")
        raise SystemExit(1)

    print(
        f"Validated {len(products)} products, {len(reviews)} reviews, "
        f"{len(profiles)} profiles, {len(taxonomy)} attributes, and {len(evidence)} evidence rows."
    )
    print(f"Ratings: {dict(sorted(rating_counts.items()))}")
    print(f"Evidence sentiment: {dict(sentiment_counts)}")


if __name__ == "__main__":
    main()
