import json
import random
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RANDOM = random.Random(20260526)
PRODUCT_TARGET = 200
REVIEWS_PER_PRODUCT = 5


TAXONOMY = [
    {
        "key": "brand",
        "label": "Brand",
        "dataType": "enum",
        "description": "Synthetic demo brand name used for brand-aware filtering.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "northvale", "label": "Northvale"},
            {"value": "urbanloom", "label": "Urban Loom"},
            {"value": "aerostitch", "label": "AeroStitch"},
            {"value": "fieldmere", "label": "Fieldmere"},
            {"value": "solen", "label": "Solen"},
            {"value": "modura", "label": "Modura"},
            {"value": "evertrail", "label": "Evertrail"},
            {"value": "lumaweave", "label": "LumaWeave"},
            {"value": "atelier9", "label": "Atelier 9"},
            {"value": "verdanthill", "label": "Verdant Hill"},
            {"value": "komorebi", "label": "Komorebi"},
            {"value": "plainworks", "label": "Plainworks"},
        ],
    },
    {
        "key": "material",
        "label": "Material",
        "dataType": "enum",
        "description": "Main material or material blend used by the product.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "wool_blend", "label": "Wool Blend"},
            {"value": "cashmere_blend", "label": "Cashmere Blend"},
            {"value": "cotton", "label": "Cotton"},
            {"value": "organic_cotton", "label": "Organic Cotton"},
            {"value": "recycled_nylon", "label": "Recycled Nylon"},
            {"value": "polyester", "label": "Polyester"},
            {"value": "full_grain_leather", "label": "Full-Grain Leather"},
            {"value": "suede", "label": "Suede"},
            {"value": "canvas", "label": "Canvas"},
            {"value": "denim", "label": "Denim"},
            {"value": "fleece", "label": "Fleece"},
            {"value": "mesh", "label": "Mesh"},
            {"value": "knit_blend", "label": "Knit Blend"},
        ],
    },
    {
        "key": "season",
        "label": "Season",
        "dataType": "enum",
        "description": "Primary season or weather context for product use.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "spring", "label": "Spring"},
            {"value": "summer", "label": "Summer"},
            {"value": "fall", "label": "Fall"},
            {"value": "winter", "label": "Winter"},
            {"value": "all_season", "label": "All Season"},
        ],
    },
    {
        "key": "fit",
        "label": "Fit",
        "dataType": "enum",
        "description": "Primary fit profile used for user preference filtering.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "slim", "label": "Slim"},
            {"value": "regular", "label": "Regular"},
            {"value": "relaxed", "label": "Relaxed"},
            {"value": "oversized", "label": "Oversized"},
            {"value": "adjustable", "label": "Adjustable"},
        ],
    },
    {
        "key": "style",
        "label": "Style",
        "dataType": "enum",
        "description": "Visual style that can be matched with natural-language requests.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "minimal", "label": "Minimal"},
            {"value": "technical", "label": "Technical"},
            {"value": "classic", "label": "Classic"},
            {"value": "sporty", "label": "Sporty"},
            {"value": "outdoor", "label": "Outdoor"},
            {"value": "elegant", "label": "Elegant"},
            {"value": "streetwear", "label": "Streetwear"},
            {"value": "casual", "label": "Casual"},
        ],
    },
    {
        "key": "occasion",
        "label": "Occasion",
        "dataType": "enum",
        "description": "Most suitable usage context for the product.",
        "isFilterable": True,
        "isRangeFacet": False,
        "options": [
            {"value": "commute", "label": "Commute"},
            {"value": "travel", "label": "Travel"},
            {"value": "outdoor", "label": "Outdoor"},
            {"value": "office", "label": "Office"},
            {"value": "daily", "label": "Daily"},
            {"value": "formal", "label": "Formal"},
            {"value": "workout", "label": "Workout"},
        ],
    },
    {
        "key": "warmthLevel",
        "label": "Warmth Level",
        "dataType": "number",
        "unit": "level",
        "minValue": 1,
        "maxValue": 5,
        "description": "Relative warmth from 1 (very light) to 5 (very warm).",
        "isFilterable": True,
        "isRangeFacet": True,
    },
    {
        "key": "comfortLevel",
        "label": "Comfort Level",
        "dataType": "number",
        "unit": "level",
        "minValue": 1,
        "maxValue": 5,
        "description": "Relative comfort from 1 to 5 based on fit, softness, and wearability.",
        "isFilterable": True,
        "isRangeFacet": True,
    },
    {
        "key": "durabilityLevel",
        "label": "Durability Level",
        "dataType": "number",
        "unit": "level",
        "minValue": 1,
        "maxValue": 5,
        "description": "Relative durability from 1 to 5 based on material and construction.",
        "isFilterable": True,
        "isRangeFacet": True,
    },
    {
        "key": "waterproof",
        "label": "Waterproof",
        "dataType": "boolean",
        "description": "Whether the product is designed to resist rain or wet conditions.",
        "isFilterable": True,
        "isRangeFacet": False,
    },
    {
        "key": "weightGrams",
        "label": "Weight",
        "dataType": "number",
        "unit": "g",
        "minValue": 80,
        "maxValue": 2200,
        "description": "Approximate product weight in grams for lightweight/heavy requests.",
        "isFilterable": True,
        "isRangeFacet": True,
    },
]


OPTION_LABELS = {
    definition["key"]: {option["value"]: option["label"] for option in definition.get("options", [])}
    for definition in TAXONOMY
}


CATEGORY_CONFIGS = [
    {
        "category": "Outerwear",
        "count": 40,
        "subcategories": ["Coats", "Jackets", "Parkas", "Vests"],
        "materials": ["wool_blend", "cashmere_blend", "recycled_nylon", "fleece", "polyester"],
        "seasons": ["winter", "fall", "all_season"],
        "styles": ["classic", "technical", "outdoor", "minimal"],
        "occasions": ["commute", "office", "outdoor", "travel", "daily"],
        "price": (85, 520),
        "weight": (520, 1850),
        "warmth": (3, 5),
        "waterproof_rate": 0.38,
        "sizes": ["XS", "S", "M", "L", "XL"],
        "itemWords": ["코트", "자켓", "파카", "베스트"],
    },
    {
        "category": "Footwear",
        "count": 40,
        "subcategories": ["Sneakers", "Boots", "Loafers", "Running Shoes"],
        "materials": ["full_grain_leather", "suede", "mesh", "recycled_nylon", "canvas"],
        "seasons": ["all_season", "spring", "fall", "winter"],
        "styles": ["sporty", "classic", "minimal", "outdoor", "streetwear"],
        "occasions": ["commute", "daily", "workout", "travel", "office"],
        "price": (58, 310),
        "weight": (420, 1280),
        "warmth": (1, 4),
        "waterproof_rate": 0.28,
        "sizes": ["230", "240", "250", "260", "270", "280"],
        "itemWords": ["스니커즈", "부츠", "로퍼", "러닝화"],
    },
    {
        "category": "Bags",
        "count": 35,
        "subcategories": ["Backpacks", "Tote Bags", "Crossbody Bags", "Travel Bags", "Briefcases"],
        "materials": ["recycled_nylon", "canvas", "full_grain_leather", "polyester", "suede"],
        "seasons": ["all_season", "spring", "fall"],
        "styles": ["technical", "minimal", "classic", "outdoor", "casual"],
        "occasions": ["commute", "travel", "office", "daily", "outdoor"],
        "price": (42, 390),
        "weight": (260, 1700),
        "warmth": (1, 1),
        "waterproof_rate": 0.52,
        "sizes": ["One Size"],
        "itemWords": ["백팩", "토트백", "크로스백", "트래블백", "브리프케이스"],
    },
    {
        "category": "Tops",
        "count": 35,
        "subcategories": ["Knitwear", "Shirts", "Hoodies", "Tees", "Blouses"],
        "materials": ["organic_cotton", "cotton", "knit_blend", "fleece", "wool_blend"],
        "seasons": ["spring", "summer", "fall", "winter", "all_season"],
        "styles": ["minimal", "casual", "classic", "streetwear", "elegant"],
        "occasions": ["daily", "office", "commute", "formal", "travel"],
        "price": (24, 190),
        "weight": (140, 780),
        "warmth": (1, 4),
        "waterproof_rate": 0.05,
        "sizes": ["XS", "S", "M", "L", "XL"],
        "itemWords": ["니트", "셔츠", "후디", "티셔츠", "블라우스"],
    },
    {
        "category": "Bottoms",
        "count": 25,
        "subcategories": ["Denim", "Trousers", "Skirts", "Shorts", "Joggers"],
        "materials": ["denim", "cotton", "polyester", "organic_cotton", "fleece"],
        "seasons": ["spring", "summer", "fall", "all_season"],
        "styles": ["classic", "minimal", "casual", "sporty", "streetwear"],
        "occasions": ["daily", "office", "commute", "workout", "travel"],
        "price": (32, 220),
        "weight": (240, 980),
        "warmth": (1, 3),
        "waterproof_rate": 0.08,
        "sizes": ["26", "28", "30", "32", "34"],
        "itemWords": ["데님", "트라우저", "스커트", "쇼츠", "조거"],
    },
    {
        "category": "Accessories",
        "count": 25,
        "subcategories": ["Scarves", "Hats", "Gloves", "Belts", "Socks"],
        "materials": ["wool_blend", "cashmere_blend", "cotton", "full_grain_leather", "fleece"],
        "seasons": ["winter", "fall", "all_season", "summer"],
        "styles": ["classic", "minimal", "outdoor", "casual", "elegant"],
        "occasions": ["daily", "commute", "travel", "outdoor", "formal"],
        "price": (16, 155),
        "weight": (80, 520),
        "warmth": (1, 5),
        "waterproof_rate": 0.18,
        "sizes": ["One Size"],
        "itemWords": ["스카프", "햇", "글러브", "벨트", "삭스"],
    },
]


ADJECTIVES = ["에센셜", "프라임", "소프트", "테크", "시그니처", "모던", "라이트", "헤리티지", "노마드", "컴포트"]
COLORS = ["Black", "Ivory", "Navy", "Camel", "Charcoal", "Olive", "Stone", "Brown", "Sage", "Cream", "Gray", "Wine"]
USER_NAMES = ["민서", "지훈", "서연", "도윤", "하린", "준호", "유진", "지아", "현우", "수빈", "나윤", "태오"]


def option_label(key, value):
    return OPTION_LABELS.get(key, {}).get(value, str(value))


def pick_config_for_index(index):
    cursor = 0
    for config in CATEGORY_CONFIGS:
        if cursor <= index < cursor + config["count"]:
            return config, index - cursor
        cursor += config["count"]
    raise IndexError(index)


def weighted_level(low, high, bias):
    value = RANDOM.randint(low, high)
    if bias and value < high and RANDOM.random() < 0.35:
        value += 1
    return max(low, min(high, value))


def rating_detail(rating):
    five = int(40 + (rating - 3.2) * 26)
    four = int(24 + (4.9 - rating) * 8)
    three = max(3, int(18 - (rating - 3.2) * 7))
    two = max(1, int(9 - (rating - 3.2) * 3))
    one = max(0, 100 - five - four - three - two)
    total = five + four + three + two + one
    diff = 100 - total
    five += diff
    return {"1": one, "2": two, "3": three, "4": four, "5": five}


def product_rating(attributes):
    score = 3.45
    score += attributes["comfortLevel"] * 0.17
    score += attributes["durabilityLevel"] * 0.12
    score += (0.08 if attributes["waterproof"] else 0)
    score += RANDOM.choice([-0.18, -0.08, 0, 0.07, 0.12])
    return round(max(3.4, min(4.9, score)), 1)


def review_rating(product_rating_value, review_index):
    base = round(product_rating_value)
    shift = [-1, 0, 0, 0, 1][review_index % 5]
    return max(3, min(5, base + shift))


def date_for_review(product_id, review_index):
    start = date(2025, 1, 3)
    return (start + timedelta(days=(product_id * 11 + review_index * 37) % 500)).isoformat()


def build_features(product, labels):
    waterproof_sentence = "생활 방수 코팅으로 갑작스러운 비에도 관리가 쉽습니다." if product["attributes"]["waterproof"] else "가벼운 생활 환경에 맞춘 데일리 구조로 설계되었습니다."
    warmth = product["attributes"]["warmthLevel"]
    comfort = product["attributes"]["comfortLevel"]
    durability = product["attributes"]["durabilityLevel"]
    weight = product["attributes"]["weightGrams"]
    return [
        f"{labels['material']} 소재를 중심으로 구성해 촉감과 형태 안정성을 함께 고려했습니다.",
        f"보온 레벨 {warmth}/5 기준의 착용감을 목표로 하며 계절 활용도가 명확합니다.",
        f"컴포트 레벨 {comfort}/5로 장시간 착용하거나 들고 다닐 때 부담을 줄였습니다.",
        f"내구성 레벨 {durability}/5에 맞춰 마감, 봉제, 하드웨어 균형을 잡았습니다.",
        f"약 {weight}g의 무게와 실사용 디테일을 기준으로 제작되었습니다. {waterproof_sentence}",
    ]


def build_product(product_id):
    config, local_index = pick_config_for_index(product_id - 1)
    subcategory = config["subcategories"][local_index % len(config["subcategories"])]
    material = config["materials"][(local_index + product_id) % len(config["materials"])]
    season = config["seasons"][(local_index * 2 + product_id) % len(config["seasons"])]
    fit = ["slim", "regular", "relaxed", "oversized", "adjustable"][(local_index + product_id) % 5]
    style = config["styles"][(local_index * 3 + product_id) % len(config["styles"])]
    occasion = config["occasions"][(local_index * 5 + product_id) % len(config["occasions"])]
    brand = TAXONOMY[0]["options"][(product_id + local_index) % len(TAXONOMY[0]["options"])]["value"]
    waterproof = RANDOM.random() < config["waterproof_rate"] or material in {"recycled_nylon", "polyester"} and RANDOM.random() < 0.35
    warmth = weighted_level(config["warmth"][0], config["warmth"][1], season == "winter")
    comfort = weighted_level(3, 5, True)
    durability = weighted_level(3, 5, material in {"full_grain_leather", "recycled_nylon", "denim"})
    weight = RANDOM.randint(config["weight"][0], config["weight"][1])
    price = round(RANDOM.uniform(config["price"][0], config["price"][1]) / 5) * 5 - 1
    attributes = {
        "brand": brand,
        "material": material,
        "season": season,
        "fit": fit,
        "style": style,
        "occasion": occasion,
        "warmthLevel": warmth,
        "comfortLevel": comfort,
        "durabilityLevel": durability,
        "waterproof": waterproof,
        "weightGrams": weight,
    }
    labels = {key: option_label(key, value) if isinstance(value, str) else value for key, value in attributes.items()}
    product_word = config["itemWords"][local_index % len(config["itemWords"])]
    adjective = ADJECTIVES[(product_id + local_index) % len(ADJECTIVES)]
    name = f"{labels['brand']} {adjective} {option_label('material', material)} {product_word}"
    keyword = f"{option_label('style', style)} {subcategory}".lower()
    colors = [COLORS[(product_id + offset * 3) % len(COLORS)] for offset in range(4)]
    rating = product_rating(attributes)
    review_count = RANDOM.randint(80, 5200)
    product = {
        "id": product_id,
        "name": name,
        "keyword": keyword,
        "category": config["category"],
        "subCategory": subcategory,
        "price": f"{price:.2f}",
        "rating": rating,
        "reviewCount": f"{review_count:,}",
        "ratingDetail": rating_detail(rating),
        "img": f"https://loremflickr.com/600/600/{subcategory.lower().replace(' ', '-')},fashion?lock={product_id}",
        "brandStory": f"{labels['brand']}는 실사용자의 선택 기준을 중심으로 소재, 착용감, 내구성을 균형 있게 설계하는 데모 브랜드입니다.",
        "desc": f"{option_label('occasion', occasion)} 상황에 맞춰 설계된 {name}입니다. {option_label('material', material)} 소재와 {option_label('fit', fit)} 핏을 기반으로 사용자가 비교하기 쉬운 속성을 갖췄습니다.",
        "sizes": config["sizes"],
        "colors": colors,
        "features": [],
        "descImages": [
            f"https://loremflickr.com/600/800/{subcategory.lower().replace(' ', '-')},detail?lock={product_id}1",
            f"https://loremflickr.com/600/800/{subcategory.lower().replace(' ', '-')},material?lock={product_id}2",
        ],
        "brandImages": [
            f"https://loremflickr.com/1200/400/{keyword.replace(' ', '-')},studio?lock={product_id}3",
            f"https://loremflickr.com/1200/400/{keyword.replace(' ', '-')},lifestyle?lock={product_id}4",
        ],
        "attributes": attributes,
    }
    product["features"] = build_features(product, labels)
    return product


def evidence_sentence(product, attribute_key):
    attrs = product["attributes"]
    labels = {key: option_label(key, value) if isinstance(value, str) else value for key, value in attrs.items()}
    if attribute_key == "warmthLevel":
        return f"보온감은 {attrs['warmthLevel']}/5 수준이라 계절 선택 기준을 세우기 쉽습니다"
    if attribute_key == "comfortLevel":
        return f"착용감은 {attrs['comfortLevel']}/5 수준으로 장시간 사용에도 안정적입니다"
    if attribute_key == "durabilityLevel":
        return f"내구성은 {attrs['durabilityLevel']}/5 수준이라 반복 사용에 대한 기대가 큽니다"
    if attribute_key == "waterproof":
        return "방수 처리가 체감되어 비 오는 날에도 부담이 적습니다" if attrs["waterproof"] else "방수 기능보다는 일상 사용감에 초점을 둔 제품입니다"
    if attribute_key == "weightGrams":
        return f"무게가 약 {attrs['weightGrams']}g이라 휴대성과 안정감의 균형을 확인할 수 있습니다"
    if attribute_key == "material":
        return f"{labels['material']} 소재가 제품의 촉감과 관리 방식을 분명하게 만듭니다"
    if attribute_key == "fit":
        return f"{labels['fit']} 핏이라 원하는 실루엣 기준으로 고르기 좋습니다"
    return f"{labels.get(attribute_key, attrs.get(attribute_key))} 기준이 선택에 도움이 됩니다"


def build_reviews(products):
    reviews = []
    evidence = []
    review_id = 1
    evidence_id = 1
    evidence_keys = ["warmthLevel", "comfortLevel", "durabilityLevel", "waterproof", "weightGrams", "material", "fit"]
    for product in products:
        for review_index in range(REVIEWS_PER_PRODUCT):
            chosen = [evidence_keys[(product["id"] + review_index) % len(evidence_keys)], evidence_keys[(product["id"] + review_index + 3) % len(evidence_keys)]]
            sentences = [evidence_sentence(product, key) for key in chosen]
            rating = review_rating(product["rating"], review_index)
            sentiment = "positive" if rating >= 4 else "neutral"
            comment = f"{sentences[0]}. {sentences[1]}. 가격과 옵션을 함께 보면 비교 기준이 명확해서 선택하기 편했습니다."
            review = {
                "id": review_id,
                "productId": product["id"],
                "userName": USER_NAMES[(product["id"] + review_index) % len(USER_NAMES)],
                "rating": rating,
                "date": date_for_review(product["id"], review_index),
                "title": f"{product['category']} 비교에 도움이 됐어요",
                "comment": comment,
                "isVerified": True,
            }
            reviews.append(review)
            for key, sentence in zip(chosen, sentences):
                evidence.append(
                    {
                        "id": evidence_id,
                        "reviewId": review_id,
                        "productId": product["id"],
                        "attributeKey": key,
                        "sentiment": sentiment,
                        "evidenceText": sentence,
                        "source": "generated",
                        "humanReviewStatus": "generated",
                    }
                )
                evidence_id += 1
            review_id += 1
    return reviews, evidence


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if sum(config["count"] for config in CATEGORY_CONFIGS) != PRODUCT_TARGET:
        raise RuntimeError("Category counts do not match PRODUCT_TARGET.")

    products = [build_product(product_id) for product_id in range(1, PRODUCT_TARGET + 1)]
    reviews, evidence = build_reviews(products)

    write_json(ROOT / "attribute_taxonomy.json", TAXONOMY)
    write_json(ROOT / "products.json", products)
    write_json(ROOT / "review.json", reviews)
    write_json(ROOT / "review_evidence.json", evidence)

    print(f"Generated {len(products)} products, {len(reviews)} reviews, and {len(evidence)} evidence rows.")


if __name__ == "__main__":
    main()
