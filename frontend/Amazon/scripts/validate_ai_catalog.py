import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_PRODUCTS = 200
EXPECTED_REVIEWS = 1000
EXPECTED_REVIEWS_PER_PRODUCT = 5
REQUIRED_STATUS = {"generated", "reviewed", "approved"}
REQUIRED_SENTIMENT = {"positive", "neutral", "negative"}


def load_json(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def fail(errors, message):
    errors.append(message)


def main():
    errors = []
    products = load_json("products.json")
    reviews = load_json("review.json")
    taxonomy = load_json("attribute_taxonomy.json")
    evidence = load_json("review_evidence.json")

    definitions = {item["key"]: item for item in taxonomy}
    required_keys = set(definitions)
    option_values = {
        item["key"]: {option["value"] for option in item.get("options", [])}
        for item in taxonomy
        if item["dataType"] == "enum"
    }

    if len(products) != EXPECTED_PRODUCTS:
        fail(errors, f"Expected {EXPECTED_PRODUCTS} products, found {len(products)}.")
    if len(reviews) != EXPECTED_REVIEWS:
        fail(errors, f"Expected {EXPECTED_REVIEWS} reviews, found {len(reviews)}.")

    product_ids = set()
    for product in products:
        product_id = product.get("id")
        if product_id in product_ids:
            fail(errors, f"Duplicate product id {product_id}.")
        product_ids.add(product_id)
        if product.get("category") == "Footwears":
            fail(errors, f"Product {product_id} uses typo category Footwears.")
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
    reviews_by_product = Counter()
    for review in reviews:
        review_id = review.get("id")
        product_id = review.get("productId")
        if review_id in review_ids:
            fail(errors, f"Duplicate review id {review_id}.")
        review_ids.add(review_id)
        if product_id not in product_ids:
            fail(errors, f"Review {review_id} references missing product {product_id}.")
        reviews_by_product[product_id] += 1
        if not 1 <= int(review.get("rating", 0)) <= 5:
            fail(errors, f"Review {review_id} has invalid rating.")

    for product_id in product_ids:
        if reviews_by_product[product_id] != EXPECTED_REVIEWS_PER_PRODUCT:
            fail(errors, f"Product {product_id} has {reviews_by_product[product_id]} reviews.")

    evidence_by_review = defaultdict(int)
    evidence_ids = set()
    for item in evidence:
        evidence_id = item.get("id")
        review_id = item.get("reviewId")
        product_id = item.get("productId")
        attribute_key = item.get("attributeKey")
        if evidence_id in evidence_ids:
            fail(errors, f"Duplicate evidence id {evidence_id}.")
        evidence_ids.add(evidence_id)
        if review_id not in review_ids:
            fail(errors, f"Evidence {evidence_id} references missing review {review_id}.")
        if product_id not in product_ids:
            fail(errors, f"Evidence {evidence_id} references missing product {product_id}.")
        if attribute_key not in definitions:
            fail(errors, f"Evidence {evidence_id} references unknown attribute {attribute_key}.")
        if item.get("sentiment") not in REQUIRED_SENTIMENT:
            fail(errors, f"Evidence {evidence_id} has invalid sentiment.")
        if item.get("humanReviewStatus") not in REQUIRED_STATUS:
            fail(errors, f"Evidence {evidence_id} has invalid humanReviewStatus.")
        if not item.get("evidenceText"):
            fail(errors, f"Evidence {evidence_id} is missing evidenceText.")
        evidence_by_review[review_id] += 1

    for review_id in review_ids:
        if evidence_by_review[review_id] < 1:
            fail(errors, f"Review {review_id} has no evidence rows.")

    if errors:
        print("Validation failed:")
        for error in errors[:50]:
            print(f"- {error}")
        if len(errors) > 50:
            print(f"...and {len(errors) - 50} more errors.")
        raise SystemExit(1)

    print(
        f"Validated {len(products)} products, {len(reviews)} reviews, "
        f"{len(taxonomy)} attributes, and {len(evidence)} evidence rows."
    )


if __name__ == "__main__":
    main()
