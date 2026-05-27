import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "fixtures" / "amazon-human"
BATCH_ROOT = ROOT / "batches"
REQUIRED_STATUS = {"generated", "reviewed", "approved"}
REQUIRED_SENTIMENT = {"positive", "neutral", "negative"}
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
}


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fail(errors, message):
    errors.append(message)


def main():
    errors = []
    taxonomy = load_json(ROOT / "attribute_taxonomy.json")
    definitions = {item["key"]: item for item in taxonomy}
    required_keys = set(definitions)
    options = {
        item["key"]: {option["value"] for option in item.get("options", [])}
        for item in taxonomy
        if item["dataType"] == "enum"
    }

    products = []
    reviews = []
    profiles = []
    evidence = []
    batch_files = sorted(BATCH_ROOT.glob("batch-*.json"))
    if not batch_files:
        fail(errors, "No batch files found.")

    for batch_file in batch_files:
        batch = load_json(batch_file)
        products.extend(batch.get("products", []))
        reviews.extend(batch.get("reviews", []))
        profiles.extend(batch.get("reviewProfiles", []))
        evidence.extend(batch.get("reviewEvidence", []))

    product_ids = set()
    for product in products:
        product_id = product.get("id")
        if product_id in product_ids:
            fail(errors, f"Duplicate product id {product_id}.")
        product_ids.add(product_id)
        attributes = product.get("attributes", {})
        missing = sorted(required_keys - set(attributes))
        if missing:
            fail(errors, f"Product {product_id} missing attributes: {', '.join(missing)}.")
        total = sum(int(product.get("ratingDetail", {}).get(str(value), 0)) for value in range(1, 6))
        if total != 100:
            fail(errors, f"Product {product_id} ratingDetail sums to {total}.")
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

    review_ids = set()
    reviews_by_id = {}
    reviews_by_product = defaultdict(list)
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

    profile_ids = set()
    for profile in profiles:
        review_id = profile.get("reviewId")
        if review_id not in review_ids:
            fail(errors, f"Profile references missing review {review_id}.")
        if review_id in profile_ids:
            fail(errors, f"Duplicate profile for review {review_id}.")
        profile_ids.add(review_id)
    if review_ids - profile_ids:
        fail(errors, f"{len(review_ids - profile_ids)} reviews missing profiles.")

    evidence_ids = set()
    evidence_by_review = Counter()
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
        if item.get("sentiment") not in REQUIRED_SENTIMENT:
            fail(errors, f"Evidence {evidence_id} invalid sentiment.")
        if item.get("issueType", "none") not in REQUIRED_ISSUES:
            fail(errors, f"Evidence {evidence_id} invalid issueType.")
        if item.get("humanReviewStatus") not in REQUIRED_STATUS:
            fail(errors, f"Evidence {evidence_id} invalid humanReviewStatus.")
        if int(item.get("severity", -1)) < 0 or int(item.get("severity", -1)) > 5:
            fail(errors, f"Evidence {evidence_id} invalid severity.")
        text = item.get("evidenceText", "")
        comment = reviews_by_id.get(review_id, {}).get("comment", "")
        if text not in comment:
            fail(errors, f"Evidence {evidence_id} text is not in review {review_id}.")
        evidence_by_review[review_id] += 1

    for review_id in review_ids:
        if evidence_by_review[review_id] < 2:
            fail(errors, f"Review {review_id} has fewer than 2 evidence rows.")

    if errors:
        print("Validation failed:")
        for error in errors[:80]:
            print(f"- {error}")
        if len(errors) > 80:
            print(f"...and {len(errors) - 80} more errors.")
        raise SystemExit(1)

    print(
        f"Validated {len(batch_files)} batches, {len(products)} products, "
        f"{len(reviews)} reviews, {len(profiles)} profiles, and {len(evidence)} evidence rows."
    )


if __name__ == "__main__":
    main()
