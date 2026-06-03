import json
import math
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC_PRODUCTS = ROOT / "frontend" / "Amazon" / "src_op" / "data" / "products.ts"
SRC_REVIEWS = ROOT / "frontend" / "Amazon" / "src_op" / "data" / "reviews.ts"
FIXTURE_ROOT = ROOT / "backend" / "fixtures" / "amazon-human"
ARCHIVE_ROOT = FIXTURE_ROOT / "archive" / "src-op"

PRODUCT_ID_OFFSET = 10000
REVIEW_ID_OFFSET = 100000
EVIDENCE_ID_OFFSET = 1000000
BATCH_SIZE = 100


def extract_array(text: str, marker: str):
    marker_index = text.index(marker)
    start = text.index("= [", marker_index) + 2
    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : index + 1])
    raise ValueError(f"Could not parse array for {marker}")


def normalize_category(value: str):
    if value == "Footwears":
        return "Footwear"
    return value


def normalize_subcategory(value: str):
    if value in {"Scarf", "Scarfs"}:
        return "Scarves"
    if value == "T-shirts":
        return "Tees"
    if value == "Running":
        return "Running Shoes"
    return value


def compact_text(value):
    return re.sub(r"\s+", " ", str(value)).strip()


def review_fingerprint(product, review):
    text = compact_text(review.get("comment", "")).lower()
    replacements = [
        product.get("name", ""),
        product.get("Material", ""),
        product.get("keyword", ""),
        "premium genuine material",
    ]
    replacements.extend(product.get("colors", []))
    for replacement in replacements:
        if replacement:
            text = text.replace(str(replacement).lower(), "{x}")
    text = re.sub(r"[a-z0-9._%+-]+", "{x}", text)
    text = re.sub(r"\d+", "{n}", text)
    text = re.sub(r"\{x\}", "", text)
    text = re.sub(r"\s+", "", text)
    return text


def is_context_mismatch(product, review):
    category = normalize_category(product.get("category", ""))
    subcategory = normalize_subcategory(product.get("subCategory", ""))
    text = f"{review.get('title', '')} {review.get('comment', '')}"
    if "Premium Genuine Material" in text:
        return True
    non_clothing_categories = {"Footwear", "Accessories", "Bags"}
    if category in non_clothing_categories:
        clothing_only_phrases = [
            "옷 전면",
            "옷이 ",
            "옷을 ",
            "옷으로",
            "입어봤",
            "입어 봤",
            "걸쳐보",
            "걸쳐 보",
            "암홀",
            "숄더",
            "전신에 어울리는 이쁜 핏감",
        ]
        if any(phrase in text for phrase in clothing_only_phrases):
            return True
    if subcategory in {"Sunglasses", "Watches", "Wallets", "Belts"}:
        object_mismatch_phrases = ["포근", "보온", "온몸", "전신", "핏감", "피팅감", "착용감이 포근"]
        if any(phrase in text for phrase in object_mismatch_phrases):
            return True
    if category == "Footwear" and any(phrase in text for phrase in ["상체", "어깨", "소매", "암홀"]):
        return True
    return False


def parse_price(value):
    return f"{float(str(value).replace(',', '')):.2f}"


def percentages_from_reviews(reviews):
    counts = {str(value): 0 for value in range(1, 6)}
    for review in reviews:
        counts[str(int(review["rating"]))] += 1
    percentages = {key: round((count / len(reviews)) * 100) for key, count in counts.items()}
    percentages["5"] += 100 - sum(percentages.values())
    return percentages


def color_family(colors):
    joined = " ".join(str(color).lower() for color in colors)
    if any(value in joined for value in ["black", "검정"]):
        return "black"
    if any(value in joined for value in ["navy", "blue", "indigo", "denim"]):
        return "navy"
    if any(value in joined for value in ["sky"]):
        return "sky_blue"
    if any(value in joined for value in ["white", "ivory"]):
        return "ivory"
    if any(value in joined for value in ["cream"]):
        return "cream"
    if any(value in joined for value in ["camel", "brown", "tan"]):
        return "brown"
    if any(value in joined for value in ["beige"]):
        return "beige"
    if any(value in joined for value in ["charcoal"]):
        return "charcoal"
    if any(value in joined for value in ["gray", "grey", "silver"]):
        return "gray"
    if any(value in joined for value in ["olive", "green", "forest"]):
        return "olive"
    if any(value in joined for value in ["burgundy", "wine", "red"]):
        return "burgundy"
    return "stone"


def material_value(product):
    text = " ".join(
        str(product.get(field, ""))
        for field in ["name", "keyword", "Material", "desc", "category", "subCategory"]
    ).lower()
    if any(value in text for value in ["cashmere", "캐시미어", "wool", "울", "merino"]):
        return "wool_blend"
    if any(value in text for value in ["down", "goose", "덕다운", "구스", "패딩"]):
        return "down"
    if any(value in text for value in ["denim", "데님", "jean"]):
        return "denim"
    if any(value in text for value in ["linen", "린넨"]):
        return "linen_blend"
    if any(value in text for value in ["leather", "가죽", "cowhide", "saffiano"]):
        return "leather"
    if any(value in text for value in ["mesh", "메쉬"]):
        return "mesh_knit"
    if any(value in text for value in ["fleece", "플리스"]):
        return "fleece"
    if any(value in text for value in ["corduroy", "코듀로이"]):
        return "corduroy"
    if any(value in text for value in ["satin", "새틴"]):
        return "satin"
    if any(value in text for value in ["silk", "실크"]):
        return "silk_blend"
    if any(value in text for value in ["acetate", "sunglasses", "선글라스"]):
        return "acetate"
    if any(value in text for value in ["metal", "watch", "시계"]):
        return "metal"
    if any(value in text for value in ["canvas", "캔버스"]):
        return "canvas"
    if any(value in text for value in ["cotton", "면", "셔츠", "shirt", "tee"]):
        return "cotton_poplin" if "shirt" in text or "셔츠" in text else "cotton_jersey"
    if any(value in text for value in ["nylon", "나일론", "windbreaker", "방수", "waterproof"]):
        return "technical_shell"
    return "synthetic_blend"


def brand_for(category, subcategory):
    if category == "Outerwear":
        return "northvale" if subcategory in {"Coats", "Paddings", "Vests"} else "evertrail"
    if category == "Footwear":
        return "solen"
    if category == "Bottoms":
        return "modura"
    if category == "Tops":
        return "plainworks" if subcategory in {"Shirts", "Knit Tops", "Sweaters"} else "lumaweave"
    if category == "Dresses":
        return "lumaweave"
    return "evertrail"


def levels_for(product, category, subcategory, material):
    text = " ".join(str(product.get(field, "")) for field in ["name", "keyword", "desc", "Material"]).lower()
    warmth = 2
    breathability = 3
    stretch = 1
    softness = 3
    durability = 3
    comfort = 3
    if category == "Outerwear":
        warmth = 5 if subcategory in {"Coats", "Paddings"} else 3
        durability = 4
        breathability = 2
        comfort = 3
    if category == "Footwear":
        warmth = 1 if subcategory in {"Sneakers", "Running Shoes", "Sandals"} else 3
        breathability = 5 if material == "mesh_knit" else 3
        comfort = 4
        durability = 3
        stretch = 2
    if category == "Accessories":
        warmth = 4 if subcategory in {"Hats", "Scarves", "Socks"} else 1
        durability = 4 if subcategory in {"Bags", "Belts", "Wallets", "Watches"} else 3
        comfort = 3
    if category == "Bottoms":
        warmth = 2
        stretch = 4 if subcategory in {"Slacks", "Pants"} else 2
        durability = 4 if subcategory == "Jeans" else 3
        comfort = 3
    if category == "Tops":
        warmth = 4 if subcategory in {"Sweaters", "Hoodies"} else 2
        breathability = 4 if subcategory in {"Tees", "Shirts"} else 3
        stretch = 4 if subcategory in {"Sweaters", "Hoodies", "Knit Tops"} else 1
        comfort = 4
    if any(value in text for value in ["light", "라이트", "summer", "쿨", "메쉬"]):
        warmth = max(1, warmth - 1)
        breathability = min(5, breathability + 1)
    if any(value in text for value in ["premium", "프리미엄", "cashmere", "실크"]):
        softness = 4
    return {
        "warmthLevel": max(1, min(5, warmth)),
        "comfortLevel": max(1, min(5, comfort)),
        "durabilityLevel": max(1, min(5, durability)),
        "breathabilityLevel": max(1, min(5, breathability)),
        "stretchLevel": max(1, min(5, stretch)),
        "softnessLevel": max(1, min(5, softness)),
    }


def product_weight(category, subcategory):
    if category == "Footwear":
        return 540 if subcategory in {"Sneakers", "Running Shoes"} else 760
    if category == "Accessories":
        return {
            "Bags": 820,
            "Wallets": 140,
            "Belts": 180,
            "Hats": 120,
            "Scarves": 160,
            "Sunglasses": 60,
            "Watches": 110,
            "Socks": 70,
        }.get(subcategory, 160)
    if category == "Outerwear":
        return {
            "Coats": 1200,
            "Paddings": 880,
            "Jackets": 650,
            "Blazers": 540,
            "Windbreakers": 360,
        }.get(subcategory, 620)
    if category == "Bottoms":
        return 520 if subcategory == "Jeans" else 390
    if category == "Tops":
        return 420 if subcategory in {"Hoodies", "Sweaters"} else 230
    return 310


def is_waterproof(product, category, subcategory):
    text = " ".join(str(product.get(field, "")) for field in ["name", "keyword", "desc"] + [" ".join(product.get("features", []))]).lower()
    return any(value in text for value in ["waterproof", "water", "방수", "rain", "ykk"]) or subcategory in {"Windbreakers", "Bags"}


def attributes_for(product):
    category = normalize_category(product["category"])
    subcategory = normalize_subcategory(product["subCategory"])
    material = material_value(product)
    levels = levels_for(product, category, subcategory, material)
    fit = "adjustable" if category == "Accessories" else "regular"
    if category == "Tops" and subcategory in {"Hoodies", "Sweaters", "Tees"}:
        fit = "relaxed"
    if category == "Bottoms" and subcategory in {"Slacks", "Pants"}:
        fit = "slim"
    style = "technical" if subcategory in {"Bags", "Windbreakers", "Running Shoes"} else "casual"
    if category == "Bottoms" or subcategory in {"Blazers", "Shirts", "Slacks"}:
        style = "office"
    if subcategory in {"Coats", "Loafers", "Belts", "Watches"}:
        style = "classic"
    occasion = "daily"
    if style == "office":
        occasion = "office"
    if subcategory in {"Bags", "Windbreakers"}:
        occasion = "commute"
    if subcategory in {"Running Shoes", "Socks"}:
        occasion = "workout"
    season = "all_season"
    if subcategory in {"Coats", "Paddings", "Scarves"}:
        season = "winter"
    elif subcategory in {"Tees", "Sandals", "Running Shoes"}:
        season = "summer"
    elif subcategory in {"Jackets", "Windbreakers", "Sweaters", "Hoodies"}:
        season = "fall"

    shoulder = "not_applicable"
    if category in {"Outerwear", "Tops", "Dresses"}:
        shoulder = "structured" if subcategory in {"Coats", "Blazers"} else "natural"
        if subcategory in {"Hoodies", "Tees"}:
            shoulder = "dropped"
    waist = "not_applicable"
    if category == "Bottoms":
        waist = "high" if subcategory in {"Slacks", "Pants"} else "mid"
    if category == "Dresses":
        waist = "mid"
    toe_box = "not_applicable"
    if category == "Footwear":
        toe_box = "wide" if subcategory in {"Sneakers", "Running Shoes"} else "regular"

    return {
        "brand": brand_for(category, subcategory),
        "material": material,
        "season": season,
        "fit": fit,
        "style": style,
        "occasion": occasion,
        "genderTarget": "unisex",
        "colorFamily": color_family(product.get("colors", [])),
        **levels,
        "waterproof": is_waterproof(product, category, subcategory),
        "weightGrams": product_weight(category, subcategory),
        "machineWashable": category in {"Tops", "Bottoms"} and subcategory not in {"Blazers"},
        "shoulderStructure": shoulder,
        "waistRise": waist,
        "toeBoxFit": toe_box,
        "capacityLiters": 18 if subcategory == "Bags" else 0,
    }


def sentence_fragments(comment):
    parts = []
    for sentence in re.split(r"[.!?]+\s*", comment):
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > 95:
            chunks = [chunk.strip() for chunk in re.split(r"[,;，]", sentence) if chunk.strip()]
            parts.extend(chunks[:2] or [sentence[:95]])
        else:
            parts.append(sentence)
    unique = []
    for part in parts:
        if len(part) >= 8 and part in comment and part not in unique:
            unique.append(part)
        if len(unique) >= 4:
            return unique
    step = max(12, math.floor(len(comment) / 5))
    index = 0
    while len(unique) < 4 and index + 12 < len(comment):
        fragment = comment[index : index + step].strip(" .,!?")
        if fragment and fragment in comment and fragment not in unique:
            unique.append(fragment)
        index += step
    if len(unique) < 4:
        unique.extend([unique[-1]] * (4 - len(unique)))
    return unique[:4]


def profile_for(review, ordinal):
    genders = ["female", "male", "nonbinary", "female", "male", "female"]
    body_types = ["average", "slim", "athletic", "petite", "curvy", "broad_shoulders", "tall", "plus"]
    usual_sizes = ["S", "M", "L", "M", "One Size", "250", "270"]
    purchased_sizes = ["S", "M", "L", "M", "One Size", "250", "270"]
    fit_by_rating = {
        1: "too_small",
        2: "slightly_small",
        3: "varies_by_body_type",
        4: "true_to_size",
        5: "true_to_size",
    }
    return {
        "reviewId": review["id"],
        "gender": genders[ordinal % len(genders)],
        "heightCm": 154 + ((ordinal * 7) % 35),
        "bodyType": body_types[ordinal % len(body_types)],
        "usualSize": usual_sizes[ordinal % len(usual_sizes)],
        "purchasedSize": purchased_sizes[ordinal % len(purchased_sizes)],
        "fitResult": fit_by_rating[int(review["rating"])],
    }


def evidence_plan(rating, category, subcategory):
    if category == "Footwear":
        keys = ["toeBoxFit", "comfortLevel", "durabilityLevel", "waterproof"]
    elif subcategory == "Bags":
        keys = ["capacityLiters", "comfortLevel", "durabilityLevel", "waterproof"]
    elif category == "Accessories":
        keys = ["material", "style", "durabilityLevel", "comfortLevel"]
    elif category == "Outerwear":
        keys = ["warmthLevel", "fit", "material", "waterproof"]
    elif category == "Bottoms":
        keys = ["fit", "waistRise", "stretchLevel", "comfortLevel"]
    else:
        keys = ["fit", "material", "breathabilityLevel", "softnessLevel"]

    if rating >= 5:
        sentiments = ["positive", "positive", "positive", "positive"]
    elif rating == 4:
        sentiments = ["positive", "positive", "positive", "neutral"]
    elif rating == 3:
        sentiments = ["positive", "neutral", "negative", "neutral"]
    elif rating == 2:
        sentiments = ["negative", "negative", "negative", "positive"]
    else:
        sentiments = ["negative", "negative", "negative", "negative"]
    return list(zip(keys, sentiments))


ISSUE_BY_KEY = {
    "fit": "sizing_issue",
    "toeBoxFit": "sizing_issue",
    "comfortLevel": "uncomfortable_fit",
    "durabilityLevel": "weak_durability",
    "waterproof": "not_waterproof_enough",
    "material": "poor_value_for_price",
    "warmthLevel": "too_thin",
    "breathabilityLevel": "not_breathable",
    "softnessLevel": "scratchy_material",
    "stretchLevel": "uncomfortable_fit",
    "waistRise": "uncomfortable_fit",
    "style": "poor_value_for_price",
    "capacityLiters": "poor_value_for_price",
}


def typed_evidence_value(key, value):
    if isinstance(value, bool):
        return {"evidenceValueBoolean": value}
    if isinstance(value, (int, float)):
        return {"evidenceValueNumber": value}
    return {"evidenceValueText": str(value)}


def build_review_evidence(review, product, new_product_id, evidence_start, attributes):
    category = product["category"]
    subcategory = product["subCategory"]
    fragments = sentence_fragments(review["comment"])
    rows = []
    for offset, (key, sentiment) in enumerate(evidence_plan(int(review["rating"]), category, subcategory)):
        issue_type = "none" if sentiment != "negative" else ISSUE_BY_KEY.get(key, "poor_value_for_price")
        severity = 0 if sentiment == "positive" else 1 if sentiment == "neutral" else min(5, 2 + (3 - int(review["rating"])))
        value = attributes[key]
        rows.append({
            "id": evidence_start + offset,
            "reviewId": review["id"],
            "productId": new_product_id,
            "attributeKey": key,
            "sentiment": sentiment,
            "issueType": issue_type,
            "severity": severity,
            **typed_evidence_value(key, value),
            "evidenceText": fragments[offset],
            "source": "src-op-normalized",
            "humanReviewStatus": "generated",
        })
    return rows


def main():
    products = extract_array(SRC_PRODUCTS.read_text(encoding="utf-8"), "const rawProducts")
    reviews = extract_array(SRC_REVIEWS.read_text(encoding="utf-8"), "export const mockReviews")
    reviews_by_product = defaultdict(list)
    for review in reviews:
        reviews_by_product[int(review["productId"])].append(review)

    used_fingerprints = set()
    clean_reviews_by_product = defaultdict(list)
    for product in sorted(products, key=lambda item: int(item["id"])):
        original_id = int(product["id"])
        used_review_ids_for_product = {int(review["id"]) for review in clean_reviews_by_product[original_id]}
        for review in sorted(reviews_by_product[original_id], key=lambda item: int(item["id"])):
            review_id = int(review["id"])
            if review_id in used_review_ids_for_product:
                continue
            if is_context_mismatch(product, review):
                continue
            fingerprint = review_fingerprint(product, review)
            if fingerprint in used_fingerprints:
                continue
            used_fingerprints.add(fingerprint)
            used_review_ids_for_product.add(review_id)
            clean_reviews_by_product[original_id].append(review)

    selected_by_id = {}
    for product in products:
        original_id = int(product["id"])
        if (
            original_id not in selected_by_id
            and len(clean_reviews_by_product[original_id]) >= 5
            and product.get("img")
            and product.get("desc")
            and product.get("ratingDetail")
        ):
            selected_by_id[original_id] = product
    selected = list(selected_by_id.values())
    selected.sort(key=lambda item: int(item["id"]))

    ARCHIVE_ROOT.mkdir(parents=True, exist_ok=True)
    for old_file in ARCHIVE_ROOT.glob("batch-src-op-*.json"):
        old_file.unlink()

    evidence_id = EVIDENCE_ID_OFFSET + 1
    written_products = 0
    written_reviews = 0
    written_evidence = 0

    for batch_index, start in enumerate(range(0, len(selected), BATCH_SIZE), start=1):
        chunk = selected[start : start + BATCH_SIZE]
        batch_products = []
        batch_reviews = []
        batch_profiles = []
        batch_evidence = []

        for product in chunk:
            original_id = int(product["id"])
            new_product_id = PRODUCT_ID_OFFSET + original_id
            category = normalize_category(product["category"])
            subcategory = normalize_subcategory(product["subCategory"])
            product_reviews = sorted(clean_reviews_by_product[original_id], key=lambda item: int(item["id"]))
            product_reviews = [
                {
                    "id": REVIEW_ID_OFFSET + (original_id * 1000) + int(review["id"]),
                    "productId": new_product_id,
                    "userName": str(review["userName"]),
                    "rating": int(review["rating"]),
                    "date": str(review.get("date", "2026-01-01")),
                    "title": str(review["title"]),
                    "comment": str(review["comment"]),
                }
                for review in product_reviews
            ]
            attributes = attributes_for(product)
            rating = round(sum(review["rating"] for review in product_reviews) / len(product_reviews), 1)
            batch_products.append({
                "id": new_product_id,
                "name": str(product["name"]),
                "keyword": str(product.get("keyword") or product["name"]),
                "category": category,
                "subCategory": subcategory,
                "price": parse_price(product["price"]),
                "rating": rating,
                "reviewCount": len(product_reviews),
                "ratingDetail": percentages_from_reviews(product_reviews),
                "img": str(product["img"]),
                "brandStory": str(product.get("brandStory") or "Source product from the frontend src_op fashion catalog, normalized for backend API use."),
                "desc": str(product["desc"]),
                "sizes": [str(size) for size in product.get("sizes", [])],
                "colors": [str(color) for color in product.get("colors", [])],
                "features": [str(feature) for feature in product.get("features", [])],
                "descImages": [str(url) for url in product.get("descImages", [])],
                "brandImages": [str(url) for url in product.get("brandImages", [])],
                "attributes": attributes,
            })

            for ordinal, review in enumerate(product_reviews, start=written_reviews):
                batch_reviews.append(review)
                batch_profiles.append(profile_for(review, ordinal))
                evidence_rows = build_review_evidence(review, {"category": category, "subCategory": subcategory}, new_product_id, evidence_id, attributes)
                evidence_id += len(evidence_rows)
                batch_evidence.extend(evidence_rows)

        batch = {
            "batchId": f"batch-src-op-{batch_index:03d}",
            "authoredBy": "src-op-normalizer",
            "authoredAt": "2026-05-28",
            "notes": "Normalized from frontend/Amazon/src_op data. Product and review prose is copied from src_op; this script does not generate review sentences.",
            "source": {
                "products": "frontend/Amazon/src_op/data/products.ts",
                "reviews": "frontend/Amazon/src_op/data/reviews.ts",
                "productIdOffset": PRODUCT_ID_OFFSET,
                "reviewIdOffset": REVIEW_ID_OFFSET,
            },
            "products": batch_products,
            "reviews": batch_reviews,
            "reviewProfiles": batch_profiles,
            "reviewEvidence": batch_evidence,
        }
        output_path = ARCHIVE_ROOT / f"batch-src-op-{batch_index:03d}.json"
        output_path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written_products += len(batch_products)
        written_reviews += len(batch_reviews)
        written_evidence += len(batch_evidence)

    print(
        f"Wrote {math.ceil(len(selected) / BATCH_SIZE)} src_op batches, "
        f"{written_products} products, {written_reviews} reviews, {written_evidence} evidence rows."
    )


if __name__ == "__main__":
    main()
