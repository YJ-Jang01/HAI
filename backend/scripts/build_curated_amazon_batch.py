import json
from pathlib import Path

from build_src_op_amazon_batches import (
    attributes_for,
    build_review_evidence,
    percentages_from_reviews,
    profile_for,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = ROOT / "backend" / "fixtures" / "amazon-human" / "archive" / "curated-source" / "batch-005.json"
OUTPUT_PATH = ROOT / "backend" / "fixtures" / "amazon-human" / "archive" / "direct-authored" / "batch-005.json"


def main():
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    output_products = []
    output_reviews = []
    output_profiles = []
    output_evidence = []
    evidence_id = int(source["evidenceStartId"])
    reviews_by_product = {}

    for review in source["reviews"]:
        reviews_by_product.setdefault(int(review["productId"]), []).append(review)

    for product in source["products"]:
        product_reviews = sorted(reviews_by_product[int(product["id"])], key=lambda item: int(item["id"]))
        attributes = attributes_for(product)
        rating = round(sum(int(review["rating"]) for review in product_reviews) / len(product_reviews), 1)
        output_products.append({
            **product,
            "price": f"{float(product['price']):.2f}",
            "rating": rating,
            "reviewCount": len(product_reviews),
            "ratingDetail": percentages_from_reviews(product_reviews),
            "attributes": attributes,
        })

        for review in product_reviews:
            output_reviews.append(review)
            output_profiles.append(profile_for(review, int(review["id"])))
            evidence_rows = build_review_evidence(
                review,
                {"category": product["category"], "subCategory": product["subCategory"]},
                int(product["id"]),
                evidence_id,
                attributes,
            )
            evidence_id += len(evidence_rows)
            output_evidence.extend(evidence_rows)

    batch = {
        "batchId": source["batchId"],
        "authoredBy": "codex",
        "authoredAt": source["authoredAt"],
        "notes": "Direct-authored supplement generated from curated-source review prose. The builder derives profiles and evidence only; it does not generate review sentences.",
        "products": output_products,
        "reviews": output_reviews,
        "reviewProfiles": output_profiles,
        "reviewEvidence": output_evidence,
    }
    OUTPUT_PATH.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUTPUT_PATH.name}: {len(output_products)} products, "
        f"{len(output_reviews)} reviews, {len(output_profiles)} profiles, {len(output_evidence)} evidence rows."
    )


if __name__ == "__main__":
    main()
