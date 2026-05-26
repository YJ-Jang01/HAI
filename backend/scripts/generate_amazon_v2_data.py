import json
import math
import random
from collections import Counter
from datetime import date, timedelta
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = BACKEND_ROOT / "fixtures" / "amazon"
RANDOM = random.Random(20260526)

PRODUCT_TARGET = 400
REVIEWS_PER_PRODUCT = 25
EVIDENCE_PER_REVIEW = 5


def enum_definition(key, label, description, options, *, is_filterable=True):
    return {
        "key": key,
        "label": label,
        "dataType": "enum",
        "description": description,
        "isFilterable": is_filterable,
        "isRangeFacet": False,
        "options": [{"value": value, "label": option_label} for value, option_label in options],
    }


def number_definition(key, label, description, min_value, max_value, *, unit="level", is_filterable=True, is_range_facet=True):
    return {
        "key": key,
        "label": label,
        "dataType": "number",
        "unit": unit,
        "minValue": min_value,
        "maxValue": max_value,
        "description": description,
        "isFilterable": is_filterable,
        "isRangeFacet": is_range_facet,
    }


def boolean_definition(key, label, description, *, is_filterable=True):
    return {
        "key": key,
        "label": label,
        "dataType": "boolean",
        "description": description,
        "isFilterable": is_filterable,
        "isRangeFacet": False,
    }


TAXONOMY = [
    enum_definition(
        "brand",
        "Brand",
        "Synthetic demo brand name used for brand-aware filtering.",
        [
            ("northvale", "Northvale"),
            ("urbanloom", "Urban Loom"),
            ("aerostitch", "AeroStitch"),
            ("fieldmere", "Fieldmere"),
            ("solen", "Solen"),
            ("modura", "Modura"),
            ("evertrail", "Evertrail"),
            ("lumaweave", "LumaWeave"),
            ("atelier9", "Atelier 9"),
            ("verdanthill", "Verdant Hill"),
            ("komorebi", "Komorebi"),
            ("plainworks", "Plainworks"),
            ("maisonrow", "Maison Row"),
            ("tiltandthread", "Tilt & Thread"),
            ("civicyard", "Civic Yard"),
            ("novaknit", "NovaKnit"),
        ],
    ),
    enum_definition(
        "material",
        "Material",
        "Main material or material blend used by the product.",
        [
            ("wool_blend", "Wool Blend"),
            ("cashmere_blend", "Cashmere Blend"),
            ("cotton", "Cotton"),
            ("organic_cotton", "Organic Cotton"),
            ("recycled_nylon", "Recycled Nylon"),
            ("polyester", "Polyester"),
            ("full_grain_leather", "Full-Grain Leather"),
            ("suede", "Suede"),
            ("canvas", "Canvas"),
            ("denim", "Denim"),
            ("fleece", "Fleece"),
            ("mesh", "Mesh"),
            ("knit_blend", "Knit Blend"),
            ("linen_blend", "Linen Blend"),
            ("rayon_blend", "Rayon Blend"),
        ],
    ),
    enum_definition(
        "season",
        "Season",
        "Primary season for product use.",
        [("spring", "Spring"), ("summer", "Summer"), ("fall", "Fall"), ("winter", "Winter"), ("all_season", "All Season")],
    ),
    enum_definition(
        "fit",
        "Fit",
        "Primary fit profile used for user preference filtering.",
        [("slim", "Slim"), ("regular", "Regular"), ("relaxed", "Relaxed"), ("oversized", "Oversized"), ("adjustable", "Adjustable")],
    ),
    enum_definition(
        "style",
        "Style",
        "Visual style that can be matched with natural-language requests.",
        [
            ("minimal", "Minimal"),
            ("technical", "Technical"),
            ("classic", "Classic"),
            ("sporty", "Sporty"),
            ("outdoor", "Outdoor"),
            ("elegant", "Elegant"),
            ("streetwear", "Streetwear"),
            ("casual", "Casual"),
        ],
    ),
    enum_definition(
        "occasion",
        "Occasion",
        "Most suitable usage context for the product.",
        [
            ("commute", "Commute"),
            ("travel", "Travel"),
            ("outdoor", "Outdoor"),
            ("office", "Office"),
            ("daily", "Daily"),
            ("formal", "Formal"),
            ("workout", "Workout"),
        ],
    ),
    enum_definition(
        "genderTarget",
        "Gender Target",
        "Primary fit and styling target for the product.",
        [("female", "Female"), ("male", "Male"), ("unisex", "Unisex")],
    ),
    enum_definition(
        "sizeRange",
        "Size Range",
        "Available sizing system for the product.",
        [
            ("clothing_xs_xl", "Clothing XS-XL"),
            ("extended_clothing", "Extended Clothing"),
            ("footwear_230_290", "Footwear 230-290"),
            ("one_size", "One Size"),
            ("bag_standard", "Bag Standard"),
        ],
    ),
    enum_definition(
        "colorFamily",
        "Color Family",
        "Dominant color family for visual preference filtering.",
        [
            ("black", "Black"),
            ("gray", "Gray"),
            ("navy", "Navy"),
            ("ivory", "Ivory"),
            ("brown", "Brown"),
            ("beige", "Beige"),
            ("green", "Green"),
            ("blue", "Blue"),
            ("red", "Red"),
            ("pastel", "Pastel"),
        ],
    ),
    enum_definition(
        "weatherUse",
        "Weather Use",
        "Weather condition where the product is most useful.",
        [("dry", "Dry"), ("rain", "Rain"), ("wind", "Wind"), ("cold", "Cold"), ("humid", "Humid"), ("mixed", "Mixed")],
    ),
    enum_definition(
        "activityUse",
        "Activity Use",
        "Activity context where the product is expected to perform well.",
        [("walking", "Walking"), ("commuting", "Commuting"), ("office", "Office"), ("travel", "Travel"), ("workout", "Workout"), ("daily_errands", "Daily Errands")],
    ),
    enum_definition(
        "lengthType",
        "Length Type",
        "General garment or item length profile.",
        [("cropped", "Cropped"), ("standard", "Standard"), ("longline", "Longline"), ("full_length", "Full Length"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "sleeveLengthType",
        "Sleeve Length Type",
        "Sleeve length profile for garments.",
        [("sleeveless", "Sleeveless"), ("short", "Short"), ("three_quarter", "Three Quarter"), ("long", "Long"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "careProfile",
        "Care Profile",
        "Expected maintenance difficulty.",
        [("easy_wash", "Easy Wash"), ("gentle_cycle", "Gentle Cycle"), ("dry_clean", "Dry Clean"), ("spot_clean", "Spot Clean"), ("hand_wash", "Hand Wash")],
    ),
    number_definition("warmthLevel", "Warmth Level", "Relative warmth from 1 to 5.", 1, 5),
    number_definition("comfortLevel", "Comfort Level", "Relative comfort from 1 to 5 based on fit, softness, and wearability.", 1, 5),
    number_definition("durabilityLevel", "Durability Level", "Relative durability from 1 to 5 based on material and construction.", 1, 5),
    boolean_definition("waterproof", "Waterproof", "Whether the product is designed to resist rain or wet conditions."),
    number_definition("weightGrams", "Weight", "Approximate product weight in grams.", 60, 2400, unit="g"),
    number_definition("thicknessLevel", "Thickness Level", "Relative material thickness from 1 to 5.", 1, 5),
    number_definition("breathabilityLevel", "Breathability Level", "Relative breathability from 1 to 5.", 1, 5),
    number_definition("stretchLevel", "Stretch Level", "Relative stretch or flexibility from 1 to 5.", 1, 5),
    number_definition("softnessLevel", "Softness Level", "Relative softness against skin from 1 to 5.", 1, 5),
    number_definition("wrinkleResistance", "Wrinkle Resistance", "Resistance to visible wrinkles from 1 to 5.", 1, 5),
    number_definition("formalityLevel", "Formality Level", "How formal the product reads from 1 to 5.", 1, 5),
    number_definition("layerability", "Layerability", "How easily the item layers with other clothing from 1 to 5.", 1, 5),
    boolean_definition("skinFriendly", "Skin Friendly", "Whether the product is designed to feel gentle on sensitive skin."),
    boolean_definition("machineWashable", "Machine Washable", "Whether regular machine washing is supported."),
    boolean_definition("packable", "Packable", "Whether the product packs down easily for travel."),
    enum_definition(
        "shoulderStructure",
        "Shoulder Structure",
        "Shoulder shape profile for tops and outerwear.",
        [("soft", "Soft"), ("natural", "Natural"), ("structured", "Structured"), ("dropped", "Dropped"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "sleeveFitProfile",
        "Sleeve Fit Profile",
        "Sleeve fit profile for tops and outerwear.",
        [("narrow", "Narrow"), ("regular", "Regular"), ("roomy", "Roomy"), ("long", "Long"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "waistRise",
        "Waist Rise",
        "Waist rise profile for bottoms.",
        [("low", "Low"), ("mid", "Mid"), ("high", "High"), ("adjustable", "Adjustable"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "hipRoom",
        "Hip Room",
        "Hip room profile for bottoms.",
        [("narrow", "Narrow"), ("regular", "Regular"), ("roomy", "Roomy"), ("very_roomy", "Very Roomy"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "inseamProfile",
        "Inseam Profile",
        "Length profile for bottoms.",
        [("short", "Short"), ("regular", "Regular"), ("long", "Long"), ("cropped", "Cropped"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "archSupport",
        "Arch Support",
        "Footwear arch support profile.",
        [("low", "Low"), ("medium", "Medium"), ("high", "High"), ("adaptive", "Adaptive"), ("not_applicable", "Not Applicable")],
    ),
    enum_definition(
        "toeBoxFit",
        "Toe Box Fit",
        "Footwear toe-box room profile.",
        [("narrow", "Narrow"), ("regular", "Regular"), ("wide", "Wide"), ("extra_wide", "Extra Wide"), ("not_applicable", "Not Applicable")],
    ),
    number_definition("cushionLevel", "Cushion Level", "Footwear cushion level; 0 means not applicable.", 0, 5),
    number_definition("capacityLiters", "Capacity", "Bag capacity in liters; 0 means not applicable.", 0, 90, unit="L"),
    boolean_definition("laptopCompatible", "Laptop Compatible", "Whether a bag includes laptop storage."),
    number_definition("strapComfortLevel", "Strap Comfort Level", "Bag or accessory strap comfort; 0 means not applicable.", 0, 5),
]

OPTION_LABELS = {
    definition["key"]: {option["value"]: option["label"] for option in definition.get("options", [])}
    for definition in TAXONOMY
}
DEFINITIONS = {definition["key"]: definition for definition in TAXONOMY}

ISSUE_TYPES = [
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
]

BODY_LABELS = {
    "petite": "아담한",
    "slim": "마른",
    "average": "보통",
    "curvy": "굴곡 있는",
    "athletic": "운동형",
    "broad_shoulders": "어깨가 있는",
    "tall": "큰 키",
    "plus": "플러스",
}

FIT_RESULT_LABELS = {
    "too_small": "많이 작게",
    "slightly_small": "조금 작게",
    "true_to_size": "정사이즈로",
    "slightly_large": "조금 크게",
    "too_large": "많이 크게",
    "varies_by_body_type": "체형에 따라 다르게",
}

CATEGORY_CONFIGS = [
    {
        "category": "Outerwear",
        "count": 80,
        "subcategories": ["Coats", "Jackets", "Parkas", "Vests"],
        "materials": ["wool_blend", "cashmere_blend", "recycled_nylon", "fleece", "polyester"],
        "seasons": ["fall", "winter", "all_season"],
        "styles": ["classic", "technical", "outdoor", "minimal"],
        "occasions": ["commute", "office", "outdoor", "travel", "daily"],
        "price": (90, 620),
        "weight": (520, 1900),
        "warmth": (3, 5),
        "thickness": (3, 5),
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "itemWords": ["코트", "자켓", "파카", "베스트"],
        "imageTag": "coats",
    },
    {
        "category": "Tops",
        "count": 70,
        "subcategories": ["Knitwear", "Shirts", "Hoodies", "Tees", "Blouses", "Sweaters", "Polos"],
        "materials": ["cotton", "organic_cotton", "linen_blend", "rayon_blend", "knit_blend", "fleece"],
        "seasons": ["spring", "summer", "fall", "all_season"],
        "styles": ["minimal", "classic", "casual", "streetwear", "elegant"],
        "occasions": ["daily", "office", "commute", "formal", "travel"],
        "price": (24, 210),
        "weight": (140, 780),
        "warmth": (1, 4),
        "thickness": (1, 4),
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "itemWords": ["셔츠", "니트", "후디", "티셔츠", "블라우스"],
        "imageTag": "tops",
    },
    {
        "category": "Bottoms",
        "count": 60,
        "subcategories": ["Denim", "Trousers", "Skirts", "Shorts", "Joggers", "Chinos"],
        "materials": ["denim", "cotton", "organic_cotton", "polyester", "rayon_blend", "linen_blend"],
        "seasons": ["spring", "summer", "fall", "all_season", "winter"],
        "styles": ["minimal", "classic", "casual", "streetwear", "sporty"],
        "occasions": ["daily", "office", "commute", "travel", "workout"],
        "price": (34, 260),
        "weight": (220, 980),
        "warmth": (1, 4),
        "thickness": (1, 4),
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "itemWords": ["데님", "트라우저", "스커트", "쇼츠", "조거"],
        "imageTag": "pants",
    },
    {
        "category": "Footwear",
        "count": 70,
        "subcategories": ["Sneakers", "Boots", "Loafers", "Running Shoes", "Flats", "Sandals", "Trail Shoes"],
        "materials": ["full_grain_leather", "suede", "mesh", "recycled_nylon", "canvas"],
        "seasons": ["spring", "summer", "fall", "winter", "all_season"],
        "styles": ["sporty", "classic", "minimal", "outdoor", "streetwear"],
        "occasions": ["commute", "daily", "workout", "travel", "office"],
        "price": (48, 360),
        "weight": (380, 1380),
        "warmth": (1, 4),
        "thickness": (1, 4),
        "sizes": ["230", "240", "250", "260", "270", "280", "290"],
        "itemWords": ["스니커즈", "부츠", "로퍼", "러닝화", "트레일화"],
        "imageTag": "shoes",
    },
    {
        "category": "Bags",
        "count": 60,
        "subcategories": ["Backpacks", "Tote Bags", "Crossbody Bags", "Travel Bags", "Briefcases", "Duffel Bags"],
        "materials": ["recycled_nylon", "canvas", "full_grain_leather", "polyester", "suede"],
        "seasons": ["all_season", "spring", "fall", "winter"],
        "styles": ["technical", "classic", "minimal", "outdoor", "elegant"],
        "occasions": ["commute", "travel", "office", "daily", "outdoor"],
        "price": (42, 430),
        "weight": (260, 2200),
        "warmth": (1, 1),
        "thickness": (1, 3),
        "sizes": ["One Size"],
        "itemWords": ["백팩", "토트백", "크로스백", "트래블백", "브리프케이스"],
        "imageTag": "bags",
    },
    {
        "category": "Accessories",
        "count": 60,
        "subcategories": ["Scarves", "Hats", "Gloves", "Belts", "Socks", "Caps"],
        "materials": ["wool_blend", "cashmere_blend", "cotton", "recycled_nylon", "full_grain_leather", "fleece"],
        "seasons": ["winter", "fall", "spring", "all_season"],
        "styles": ["classic", "minimal", "casual", "outdoor", "elegant"],
        "occasions": ["daily", "commute", "travel", "outdoor", "formal"],
        "price": (12, 160),
        "weight": (60, 460),
        "warmth": (1, 5),
        "thickness": (1, 4),
        "sizes": ["One Size", "S", "M", "L"],
        "itemWords": ["스카프", "모자", "장갑", "벨트", "삭스"],
        "imageTag": "accessories",
    },
]

QUALITY_PROFILES = ["excellent"] * 80 + ["solid"] * 140 + ["polarizing"] * 120 + ["weak"] * 60
RANDOM.shuffle(QUALITY_PROFILES)

RATING_PATTERNS = {
    "excellent": [5] * 16 + [4] * 8 + [3] * 1,
    "solid": [5] * 5 + [4] * 10 + [3] * 7 + [2] * 3,
    "polarizing": [5] * 8 + [4] * 4 + [3] * 5 + [2] * 5 + [1] * 3,
    "weak": [5] * 2 + [4] * 4 + [3] * 8 + [2] * 7 + [1] * 4,
}

QUALITY_ADJUSTMENT = {
    "excellent": 1,
    "solid": 0,
    "polarizing": -1,
    "weak": -2,
}

USER_NAMES = [
    "Minji",
    "Jae",
    "Hana",
    "Chris",
    "Yuna",
    "Alex",
    "Sora",
    "Jamie",
    "Noah",
    "Eun",
    "Mina",
    "Theo",
    "Iris",
    "Daniel",
    "Rin",
    "Grace",
]

COLOR_OPTIONS = ["black", "gray", "navy", "ivory", "brown", "beige", "green", "blue", "red", "pastel"]


def option_label(key, value):
    return OPTION_LABELS.get(key, {}).get(value, str(value))


def clamp(value, low, high):
    return max(low, min(high, value))


def pick(options, index, offset=0):
    return options[(index + offset) % len(options)]


def weighted_level(base, quality, jitter=1):
    value = base + QUALITY_ADJUSTMENT[quality] + RANDOM.randint(-jitter, jitter)
    return clamp(value, 1, 5)


def size_range_for(category):
    if category == "Footwear":
        return "footwear_230_290"
    if category == "Bags":
        return "bag_standard"
    if category == "Accessories":
        return "one_size"
    return "extended_clothing"


def category_specific_attributes(category, local_index, quality):
    attrs = {
        "shoulderStructure": "not_applicable",
        "sleeveFitProfile": "not_applicable",
        "waistRise": "not_applicable",
        "hipRoom": "not_applicable",
        "inseamProfile": "not_applicable",
        "archSupport": "not_applicable",
        "toeBoxFit": "not_applicable",
        "cushionLevel": 0,
        "capacityLiters": 0,
        "laptopCompatible": False,
        "strapComfortLevel": 0,
    }
    if category in {"Outerwear", "Tops"}:
        attrs["shoulderStructure"] = pick(["soft", "natural", "structured", "dropped"], local_index)
        attrs["sleeveFitProfile"] = pick(["narrow", "regular", "roomy", "long"], local_index, 1)
    if category == "Bottoms":
        attrs["waistRise"] = pick(["low", "mid", "high", "adjustable"], local_index)
        attrs["hipRoom"] = pick(["narrow", "regular", "roomy", "very_roomy"], local_index, 2)
        attrs["inseamProfile"] = pick(["short", "regular", "long", "cropped"], local_index, 1)
    if category == "Footwear":
        attrs["archSupport"] = pick(["low", "medium", "high", "adaptive"], local_index)
        attrs["toeBoxFit"] = pick(["narrow", "regular", "wide", "extra_wide"], local_index, 1)
        attrs["cushionLevel"] = weighted_level(4, quality, 1)
    if category == "Bags":
        attrs["capacityLiters"] = pick([8, 12, 16, 20, 24, 32, 45], local_index)
        attrs["laptopCompatible"] = attrs["capacityLiters"] >= 16
        attrs["strapComfortLevel"] = weighted_level(4, quality, 1)
    return attrs


def unique_color_labels(primary_color, local_index, product_id):
    values = []
    for offset in [0, 3, 6, 1, 4, 7, 2, 5, 8, 9]:
        candidate = primary_color if offset == 0 else pick(COLOR_OPTIONS, local_index + product_id, offset)
        if candidate not in values:
            values.append(candidate)
        if len(values) == 3:
            break
    return [option_label("colorFamily", value) for value in values]


def build_product(product_id, config, local_index, quality):
    category = config["category"]
    brand = pick([option["value"] for option in TAXONOMY[0]["options"]], product_id, local_index)
    material = pick(config["materials"], local_index, product_id)
    season = pick(config["seasons"], local_index, product_id // 3)
    fit = pick(["slim", "regular", "relaxed", "oversized", "adjustable"], local_index, product_id)
    style = pick(config["styles"], local_index, product_id // 2)
    occasion = pick(config["occasions"], local_index, product_id // 5)
    gender = pick(["female", "male", "unisex"], product_id, local_index // 2)
    color = pick(COLOR_OPTIONS, product_id, local_index)
    weather = "rain" if RANDOM.random() < 0.25 else pick(["dry", "wind", "cold", "humid", "mixed"], local_index, product_id)
    activity = "commuting" if occasion == "commute" else "office" if occasion == "office" else pick(["walking", "travel", "workout", "daily_errands"], product_id)
    min_price, max_price = config["price"]
    min_weight, max_weight = config["weight"]
    warmth = clamp(RANDOM.randint(*config["warmth"]) + (1 if season == "winter" else 0), 1, 5)
    thickness = clamp(RANDOM.randint(*config["thickness"]) + (1 if season == "winter" else 0), 1, 5)
    comfort = weighted_level(4, quality, 1)
    durability = weighted_level(4, quality, 1)
    breathability = clamp(6 - thickness + RANDOM.randint(-1, 1), 1, 5)
    stretch = weighted_level(3 if category in {"Bottoms", "Tops", "Footwear"} else 2, quality, 1)
    softness = weighted_level(4, quality, 1)
    wrinkle = weighted_level(4, quality, 1)
    formality = clamp(4 if occasion in {"office", "formal"} else 2 + RANDOM.randint(0, 2), 1, 5)
    layerability = weighted_level(4 if category in {"Outerwear", "Tops"} else 2, quality, 1)
    waterproof = weather == "rain" or (category in {"Outerwear", "Bags", "Footwear"} and RANDOM.random() < 0.35)
    price = RANDOM.randint(min_price, max_price)
    if quality == "excellent":
        price = int(price * 1.15)
    elif quality == "weak":
        price = int(price * 0.82)
    weight = RANDOM.randint(min_weight, max_weight)
    if category in {"Bags", "Outerwear"} and quality == "weak":
        weight = min(max_weight, weight + RANDOM.randint(120, 280))
    length_type = "not_applicable" if category in {"Footwear", "Bags", "Accessories"} else pick(["cropped", "standard", "longline", "full_length"], local_index)
    sleeve_type = "not_applicable" if category not in {"Outerwear", "Tops"} else pick(["sleeveless", "short", "three_quarter", "long"], local_index, 1)
    care_profile = "dry_clean" if material in {"cashmere_blend", "wool_blend", "suede", "full_grain_leather"} and RANDOM.random() < 0.45 else pick(["easy_wash", "gentle_cycle", "spot_clean", "hand_wash"], product_id)
    attrs = {
        "brand": brand,
        "material": material,
        "season": season,
        "fit": fit,
        "style": style,
        "occasion": occasion,
        "genderTarget": gender,
        "sizeRange": size_range_for(category),
        "colorFamily": color,
        "weatherUse": weather,
        "activityUse": activity,
        "lengthType": length_type,
        "sleeveLengthType": sleeve_type,
        "careProfile": care_profile,
        "warmthLevel": warmth,
        "comfortLevel": comfort,
        "durabilityLevel": durability,
        "waterproof": waterproof,
        "weightGrams": weight,
        "thicknessLevel": thickness,
        "breathabilityLevel": breathability,
        "stretchLevel": stretch,
        "softnessLevel": softness,
        "wrinkleResistance": wrinkle,
        "formalityLevel": formality,
        "layerability": layerability,
        "skinFriendly": softness >= 4 and material not in {"suede", "full_grain_leather"},
        "machineWashable": care_profile in {"easy_wash", "gentle_cycle"},
        "packable": weight < 650 or category in {"Accessories", "Tops"},
    }
    attrs.update(category_specific_attributes(category, local_index, quality))

    labels = {key: option_label(key, value) if isinstance(value, str) else value for key, value in attrs.items()}
    subcategory = pick(config["subcategories"], local_index)
    item_word = pick(config["itemWords"], local_index, product_id)
    modifier = pick(["밸런스", "프라임", "에센셜", "테크", "모던", "라이트", "시그니처", "컴포트"], local_index, product_id)
    name = f"{option_label('brand', brand)} {modifier} {option_label('material', material)} {item_word}"
    sizes = config["sizes"]
    colors = unique_color_labels(color, local_index, product_id)
    product = {
        "id": product_id,
        "name": name,
        "keyword": f"{style} {subcategory.lower()}",
        "category": category,
        "subCategory": subcategory,
        "price": f"{price:.2f}",
        "rating": 0,
        "reviewCount": RANDOM.randint(180, 8200),
        "ratingDetail": {},
        "img": f"https://loremflickr.com/600/600/{config['imageTag']},fashion?lock={product_id}",
        "brandStory": f"{option_label('brand', brand)}는 합성 데모 카탈로그를 위한 브랜드로, 사용자가 장점과 단점을 함께 비교할 수 있도록 제품별 특성을 다르게 설계했습니다.",
        "desc": f"{option_label('occasion', occasion)} 상황에 맞춘 {name}입니다. {labels['material']} 소재, {labels['fit']} 핏, {labels['weatherUse']} 날씨 대응성을 기준으로 비교할 수 있습니다.",
        "sizes": sizes,
        "colors": colors,
        "features": [
            f"{labels['material']} 소재와 {labels['fit']} 핏을 기반으로 한 {labels['style']} 스타일입니다.",
            f"보온 {attrs['warmthLevel']}/5, 통기성 {attrs['breathabilityLevel']}/5, 두께 {attrs['thicknessLevel']}/5 기준으로 계절감을 판단할 수 있습니다.",
            f"착용감 {attrs['comfortLevel']}/5, 내구성 {attrs['durabilityLevel']}/5, 부드러움 {attrs['softnessLevel']}/5로 장단점 비교가 가능합니다.",
            f"{'방수 대응이 가능한' if attrs['waterproof'] else '방수보다는 일상 사용에 초점을 둔'} 구조이며 약 {attrs['weightGrams']}g입니다.",
            f"관리 방식은 {labels['careProfile']}이고, {'기계 세탁이 가능합니다' if attrs['machineWashable'] else '관리 시 주의가 필요합니다'}.",
        ],
        "descImages": [
            f"https://loremflickr.com/600/800/{config['imageTag']},detail?lock={product_id * 10 + 1}",
            f"https://loremflickr.com/600/800/{config['imageTag']},material?lock={product_id * 10 + 2}",
        ],
        "brandImages": [
            f"https://loremflickr.com/1200/400/{config['imageTag']},studio?lock={product_id * 10 + 3}",
            f"https://loremflickr.com/1200/400/{config['imageTag']},lifestyle?lock={product_id * 10 + 4}",
        ],
        "qualityProfile": quality,
        "attributes": attrs,
    }
    return product


def rating_detail_from_ratings(ratings):
    counts = Counter(ratings)
    raw = {rating: (counts[rating] / len(ratings)) * 100 for rating in range(1, 6)}
    floored = {rating: math.floor(value) for rating, value in raw.items()}
    remainder = 100 - sum(floored.values())
    fractions = sorted(((raw[rating] - floored[rating], rating) for rating in range(1, 6)), reverse=True)
    for _, rating in fractions[:remainder]:
        floored[rating] += 1
    return {str(rating): floored[rating] for rating in range(1, 6)}


def review_date(product_id, review_index):
    start = date(2024, 1, 2)
    return (start + timedelta(days=(product_id * 9 + review_index * 23) % 780)).isoformat()


def build_profile(product, review_index, rating):
    category = product["category"]
    attrs = product["attributes"]
    gender_options = ["female", "male", "nonbinary", "prefer_not_to_say"]
    body_options = ["petite", "slim", "average", "curvy", "athletic", "broad_shoulders", "tall", "plus"]
    gender = pick(gender_options, product["id"], review_index)
    body_type = pick(body_options, review_index, product["id"])
    height_base = {"petite": 156, "slim": 168, "average": 170, "curvy": 166, "athletic": 174, "broad_shoulders": 176, "tall": 186, "plus": 171}[body_type]
    height = clamp(height_base + RANDOM.randint(-7, 7), 145, 202)
    sizes = product["sizes"]
    usual = pick(sizes, review_index, product["id"])
    if category in {"Bags", "Accessories"} and "One Size" in sizes:
        usual = "One Size"
        purchased = "One Size"
    else:
        index = sizes.index(usual)
        shift = 0
        if rating <= 2:
            shift = pick([-1, 1, 0], review_index)
        elif rating == 3:
            shift = pick([0, -1, 1], review_index)
        purchased = sizes[clamp(index + shift, 0, len(sizes) - 1)]

    if purchased != usual:
        fit_result = "slightly_small" if sizes.index(purchased) < sizes.index(usual) else "slightly_large"
    elif attrs["fit"] == "slim" and body_type in {"curvy", "plus", "broad_shoulders"}:
        fit_result = "slightly_small"
    elif attrs["fit"] == "oversized" and body_type in {"petite", "slim"}:
        fit_result = "slightly_large"
    elif rating <= 2 and category not in {"Bags", "Accessories"}:
        fit_result = pick(["too_small", "too_large", "varies_by_body_type"], review_index)
    else:
        fit_result = "true_to_size"

    return {
        "gender": gender,
        "heightCm": int(height),
        "bodyType": body_type,
        "usualSize": usual,
        "purchasedSize": purchased,
        "fitResult": fit_result,
    }


POSITIVE_KEYS = [
    "material",
    "comfortLevel",
    "durabilityLevel",
    "warmthLevel",
    "breathabilityLevel",
    "stretchLevel",
    "softnessLevel",
    "occasion",
    "weatherUse",
    "style",
    "machineWashable",
    "packable",
    "fit",
]

NEUTRAL_KEYS = ["fit", "sizeRange", "colorFamily", "careProfile", "weightGrams", "lengthType", "sleeveLengthType"]

NEGATIVE_ISSUES = [
    ("sizing_issue", ["fit", "shoulderStructure", "sleeveFitProfile", "waistRise", "hipRoom", "toeBoxFit", "sizeRange"]),
    ("too_heavy", ["weightGrams"]),
    ("too_thin", ["thicknessLevel", "warmthLevel"]),
    ("too_warm", ["warmthLevel", "breathabilityLevel", "thicknessLevel"]),
    ("not_breathable", ["breathabilityLevel"]),
    ("scratchy_material", ["softnessLevel", "skinFriendly", "material"]),
    ("color_mismatch", ["colorFamily"]),
    ("wrinkles_easily", ["wrinkleResistance"]),
    ("hard_to_wash", ["careProfile", "machineWashable"]),
    ("shrinks_after_wash", ["careProfile", "material"]),
    ("weak_durability", ["durabilityLevel"]),
    ("not_waterproof_enough", ["waterproof", "weatherUse"]),
    ("poor_value_for_price", ["durabilityLevel", "material"]),
    ("uncomfortable_fit", ["comfortLevel", "fit"]),
]

CATEGORY_POSITIVE_KEYS = {
    "Outerwear": ["shoulderStructure", "sleeveFitProfile", "layerability"],
    "Tops": ["shoulderStructure", "sleeveFitProfile", "skinFriendly"],
    "Bottoms": ["waistRise", "hipRoom", "inseamProfile"],
    "Footwear": ["archSupport", "toeBoxFit", "cushionLevel"],
    "Bags": ["capacityLiters", "laptopCompatible", "strapComfortLevel"],
    "Accessories": ["softnessLevel", "warmthLevel", "packable"],
}


def value_payload(product, key):
    value = product["attributes"][key]
    definition = DEFINITIONS[key]
    if definition["dataType"] == "number":
        return {"evidenceValueNumber": value}
    if definition["dataType"] == "boolean":
        return {"evidenceValueBoolean": value}
    return {"evidenceValueText": str(value)}


def valid_key_for_product(product, key):
    value = product["attributes"].get(key)
    return value not in {None, "not_applicable"} and value != 0


def choose_positive_key(product, used):
    keys = POSITIVE_KEYS + CATEGORY_POSITIVE_KEYS.get(product["category"], [])
    keys = [key for key in keys if key not in used and valid_key_for_product(product, key)]
    return RANDOM.choice(keys or ["comfortLevel"])


def choose_neutral_key(product, used):
    keys = [key for key in NEUTRAL_KEYS if key not in used and valid_key_for_product(product, key)]
    return RANDOM.choice(keys or ["fit"])


def choose_negative_issue(product, used):
    candidates = []
    for issue, keys in NEGATIVE_ISSUES:
        valid_keys = [key for key in keys if key not in used and valid_key_for_product(product, key)]
        if valid_keys:
            candidates.append((issue, valid_keys))
    issue, keys = RANDOM.choice(candidates)
    return issue, RANDOM.choice(keys)


def sentence_for(product, profile, key, sentiment, issue_type):
    attrs = product["attributes"]
    value = attrs[key]
    label = option_label(key, value) if isinstance(value, str) else value
    body_label = BODY_LABELS[profile["bodyType"]]
    fit_result = FIT_RESULT_LABELS[profile["fitResult"]]

    if sentiment == "positive":
        if key == "material":
            return f"{option_label('material', value)} 소재가 기대보다 안정적이고 촉감도 만족스러웠습니다"
        if key == "comfortLevel":
            return f"착용감은 {value}/5 수준으로 장시간 사용에도 부담이 적었습니다"
        if key == "durabilityLevel":
            return f"내구성은 {value}/5 수준이라 반복 사용에도 형태가 잘 유지됐습니다"
        if key == "warmthLevel":
            return f"보온감은 {value}/5 수준이라 해당 계절에 충분히 따뜻했습니다"
        if key == "breathabilityLevel":
            return f"통기성은 {value}/5 수준이라 답답함이 적었습니다"
        if key == "stretchLevel":
            return f"신축성은 {value}/5 수준이라 움직일 때 편했습니다"
        if key == "softnessLevel":
            return f"부드러움은 {value}/5 수준이라 피부에 닿는 느낌이 좋았습니다"
        if key == "machineWashable":
            return "기계 세탁이 가능해서 관리 부담이 낮았습니다"
        if key == "packable":
            return "접거나 넣어 다니기 쉬워 이동할 때 편했습니다"
        if key == "laptopCompatible":
            return "노트북 수납이 가능해서 출퇴근 가방으로 쓰기 좋았습니다"
        if key == "capacityLiters":
            return f"수납 용량이 약 {value}L라 필요한 물건을 여유 있게 넣을 수 있었습니다"
        if key == "strapComfortLevel":
            return f"스트랩 착용감은 {value}/5 수준이라 오래 메도 부담이 적었습니다"
        if key == "archSupport":
            return f"{option_label('archSupport', value)} 아치 서포트가 발을 안정적으로 잡아줬습니다"
        if key == "toeBoxFit":
            return f"{option_label('toeBoxFit', value)} 토박스라 발가락 공간이 비교적 편했습니다"
        if key == "cushionLevel":
            return f"쿠션감은 {value}/5 수준이라 오래 걸을 때 도움이 됐습니다"
        return f"{option_label(key, value) if isinstance(value, str) else value} 기준이 사용 목적에 잘 맞았습니다"

    if sentiment == "neutral":
        if key == "fit":
            return f"{profile['heightCm']}cm {body_label} 체형에는 {option_label('fit', value)} 핏이 무난했지만 취향을 탈 수 있습니다"
        if key == "sizeRange":
            return f"사이즈 선택지는 {option_label('sizeRange', value)} 기준이라 선택 전 치수 확인이 필요했습니다"
        if key == "weightGrams":
            return f"무게는 약 {value}g으로 가볍지도 무겁지도 않은 편이었습니다"
        if key == "careProfile":
            return f"관리 방식은 {option_label('careProfile', value)}라 생활 패턴에 따라 다르게 느껴질 수 있습니다"
        return f"{option_label(key, value) if isinstance(value, str) else value} 요소는 특별히 좋거나 나쁘기보다 상황에 따라 달랐습니다"

    if issue_type == "sizing_issue":
        return f"{profile['heightCm']}cm {body_label} 체형에는 {profile['purchasedSize']} 사이즈가 {fit_result} 느껴졌습니다"
    if issue_type == "too_heavy":
        return f"무게가 약 {attrs['weightGrams']}g이라 오래 들거나 입기에는 부담이 있었습니다"
    if issue_type == "too_thin":
        return f"두께감은 {attrs['thicknessLevel']}/5 수준이라 기대보다 얇게 느껴졌습니다"
    if issue_type == "too_warm":
        return f"보온감이 {attrs['warmthLevel']}/5라 실내나 따뜻한 날에는 덥게 느껴졌습니다"
    if issue_type == "not_breathable":
        return f"통기성은 {attrs['breathabilityLevel']}/5 수준이라 오래 착용하면 답답했습니다"
    if issue_type == "scratchy_material":
        return f"부드러움은 {attrs['softnessLevel']}/5라 민감한 피부에는 까슬하게 느껴질 수 있습니다"
    if issue_type == "color_mismatch":
        return f"{option_label('colorFamily', attrs['colorFamily'])} 색상이 사진보다 다르게 보여 코디가 애매했습니다"
    if issue_type == "wrinkles_easily":
        return f"구김 저항은 {attrs['wrinkleResistance']}/5라 앉았다 일어나면 주름이 눈에 띄었습니다"
    if issue_type == "hard_to_wash":
        return f"관리 방식이 {option_label('careProfile', attrs['careProfile'])}라 자주 쓰기에는 번거로웠습니다"
    if issue_type == "shrinks_after_wash":
        return f"{option_label('material', attrs['material'])} 소재 특성상 세탁 후 줄어듦이 걱정됐습니다"
    if issue_type == "weak_durability":
        return f"내구성은 {attrs['durabilityLevel']}/5라 마감이 오래 버틸지는 아쉬웠습니다"
    if issue_type == "not_waterproof_enough":
        return "비 오는 날에는 방수 기대치만큼 버텨주지 못했습니다"
    if issue_type == "poor_value_for_price":
        return f"가격 대비 소재와 마감의 설득력이 충분하다고 느끼기는 어려웠습니다"
    if issue_type == "uncomfortable_fit":
        return f"착용감은 {attrs['comfortLevel']}/5라 오래 착용하면 불편함이 남았습니다"
    return f"{label} 요소에서 아쉬움이 있었습니다"


def sentiment_pattern(rating):
    if rating == 5:
        return ["positive", "positive", "positive", "positive", "neutral"]
    if rating == 4:
        return ["positive", "positive", "positive", "neutral", "negative"]
    if rating == 3:
        return ["positive", "neutral", "negative", "negative", "negative"]
    if rating == 2:
        return ["positive", "neutral", "negative", "negative", "negative"]
    return ["neutral", "negative", "negative", "negative", "negative"]


def review_title(rating):
    if rating == 5:
        return "장점이 분명하고 만족도가 높았습니다"
    if rating == 4:
        return "대체로 만족하지만 작은 아쉬움이 있습니다"
    if rating == 3:
        return "장단점이 확실해서 조건을 봐야 합니다"
    if rating == 2:
        return "기대보다 아쉬운 부분이 많았습니다"
    return "핏과 사용감 모두 신중히 봐야 합니다"


def closing_sentence(rating):
    if rating >= 4:
        return "조건이 맞는 사람에게는 다시 추천할 수 있습니다"
    if rating == 3:
        return "우선순위가 맞는지 비교하고 선택하는 편이 좋겠습니다"
    return "비슷한 조건이라면 다른 후보와 단점을 꼭 비교해보는 편이 좋겠습니다"


def purpose_sentence(product, profile):
    return f"{option_label('occasion', product['attributes']['occasion'])} 용도로 {profile['purchasedSize']} 사이즈를 사용해봤습니다"


def build_reviews(products):
    reviews = []
    profiles = []
    evidence = []
    review_id = 1
    evidence_id = 1

    for product in products:
        ratings = RATING_PATTERNS[product["qualityProfile"]][:]
        RANDOM.shuffle(ratings)
        product["rating"] = round(sum(ratings) / len(ratings), 1)
        product["ratingDetail"] = rating_detail_from_ratings(ratings)
        product["reviewCount"] = max(int(product["reviewCount"]), len(ratings))

        for review_index, rating in enumerate(ratings):
            profile = build_profile(product, review_index, rating)
            sentiments = sentiment_pattern(rating)
            used_keys = set()
            evidence_rows = []
            sentences = [purpose_sentence(product, profile)]

            for sentiment in sentiments:
                if sentiment == "positive":
                    key = choose_positive_key(product, used_keys)
                    issue_type = "none"
                    severity = 0
                elif sentiment == "neutral":
                    key = choose_neutral_key(product, used_keys)
                    issue_type = "none"
                    severity = 1
                else:
                    issue_type, key = choose_negative_issue(product, used_keys)
                    severity = clamp(2 + (5 - rating), 2, 5)
                used_keys.add(key)
                text = sentence_for(product, profile, key, sentiment, issue_type)
                sentences.append(text)
                evidence_row = {
                    "id": evidence_id,
                    "reviewId": review_id,
                    "productId": product["id"],
                    "attributeKey": key,
                    "sentiment": sentiment,
                    "issueType": issue_type,
                    "severity": severity,
                    "evidenceText": text,
                    "source": "generated",
                    "humanReviewStatus": "generated",
                }
                evidence_row.update(value_payload(product, key))
                evidence_rows.append(evidence_row)
                evidence_id += 1

            sentences.append(closing_sentence(rating))
            reviews.append(
                {
                    "id": review_id,
                    "productId": product["id"],
                    "userName": USER_NAMES[(product["id"] + review_index) % len(USER_NAMES)],
                    "rating": rating,
                    "date": review_date(product["id"], review_index),
                    "title": review_title(rating),
                    "comment": ". ".join(sentences) + ".",
                }
            )
            profiles.append({"reviewId": review_id, **profile})
            evidence.extend(evidence_rows)
            review_id += 1

    return reviews, profiles, evidence


def build_products():
    products = []
    product_id = 1
    quality_index = 0
    for config in CATEGORY_CONFIGS:
        for local_index in range(config["count"]):
            products.append(build_product(product_id, config, local_index, QUALITY_PROFILES[quality_index]))
            product_id += 1
            quality_index += 1
    return products


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main():
    products = build_products()
    reviews, profiles, evidence = build_reviews(products)
    for product in products:
        product.pop("qualityProfile", None)

    write_json(FIXTURE_ROOT / "attribute_taxonomy.json", TAXONOMY)
    write_json(FIXTURE_ROOT / "products.json", products)
    write_json(FIXTURE_ROOT / "review.json", reviews)
    write_json(FIXTURE_ROOT / "review_profiles.json", profiles)
    write_json(FIXTURE_ROOT / "review_evidence.json", evidence)

    print(
        f"Generated {len(products)} products, {len(reviews)} reviews, "
        f"{len(profiles)} review profiles, and {len(evidence)} evidence rows."
    )


if __name__ == "__main__":
    main()
