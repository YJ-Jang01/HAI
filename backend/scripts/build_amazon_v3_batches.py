import json
import math
import random
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "fixtures" / "amazon-human"
SEED_ROOT = ROOT / "seed"
RNG = random.Random(20260528)

CATEGORY_TARGETS = {
    "Outerwear": 70,
    "Tops": 70,
    "Bottoms": 65,
    "Dresses": 45,
    "Footwear": 65,
    "Bags": 45,
    "Accessories": 60,
}

BRANDS = ["northvale", "plainworks", "evertrail", "solen", "modura", "lumaweave"]
BRAND_LABELS = {
    "northvale": "Northvale",
    "plainworks": "Plainworks",
    "evertrail": "Evertrail",
    "solen": "Solen",
    "modura": "Modura",
    "lumaweave": "LumaWeave",
}

COLORS = [
    ("black", "Black"),
    ("navy", "Navy"),
    ("ivory", "Ivory"),
    ("olive", "Olive"),
    ("stone", "Stone"),
    ("sky_blue", "Sky Blue"),
    ("charcoal", "Charcoal"),
    ("gray", "Gray"),
    ("beige", "Beige"),
    ("brown", "Brown"),
    ("burgundy", "Burgundy"),
    ("cream", "Cream"),
    ("forest", "Forest"),
]

SUBCATEGORIES = {
    "Outerwear": ["Coats", "Jackets", "Rain Jackets", "Paddings", "Vests", "Blazers", "Windbreakers"],
    "Tops": ["Shirts", "Tees", "Hoodies", "Knit Tops", "Sweaters", "Blouses"],
    "Bottoms": ["Pants", "Jeans", "Skirts", "Slacks", "Trousers", "Shorts"],
    "Dresses": ["Midi Dresses", "Shirt Dresses", "Sweater Dresses", "Slip Dresses", "Wrap Dresses"],
    "Footwear": ["Sneakers", "Loafers", "Boots", "Sandals", "Trail Shoes"],
    "Bags": ["Backpacks", "Shoulder Bags", "Totes", "Crossbody Bags", "Duffels"],
    "Accessories": ["Hats", "Scarves", "Wallets", "Belts", "Sunglasses", "Gloves"],
}

MATERIALS = {
    "Outerwear": ["wool_blend", "recycled_nylon", "technical_shell", "softshell", "down", "leather", "synthetic_blend", "corduroy"],
    "Tops": ["cotton_poplin", "cotton_jersey", "rib_knit", "fleece", "linen_blend", "gauze_cotton", "mesh_knit", "silk_blend"],
    "Bottoms": ["stretch_twill", "denim", "ponte_knit", "corduroy", "linen_blend", "synthetic_blend"],
    "Dresses": ["linen_blend", "satin", "cotton_poplin", "gauze_cotton", "silk_blend", "rib_knit"],
    "Footwear": ["leather", "rubber", "mesh_knit", "recycled_nylon", "synthetic_blend", "canvas"],
    "Bags": ["canvas", "leather", "recycled_nylon", "technical_shell", "synthetic_blend"],
    "Accessories": ["cotton_jersey", "wool_blend", "leather", "acetate", "metal", "synthetic_blend", "canvas"],
}

PRODUCT_NOUNS = {
    "Coats": ["wool coat", "car coat", "wrap coat", "city coat"],
    "Jackets": ["field jacket", "utility jacket", "bomber jacket", "shirt jacket"],
    "Rain Jackets": ["rain parka", "storm shell", "commuter anorak", "packable jacket"],
    "Paddings": ["puffer jacket", "quilted coat", "down jacket", "insulated parka"],
    "Vests": ["puffer vest", "utility vest", "fleece vest", "quilted vest"],
    "Blazers": ["soft blazer", "travel blazer", "knit blazer", "tailored blazer"],
    "Windbreakers": ["windbreaker", "track shell", "running shell", "city shell"],
    "Shirts": ["cotton shirt", "overshirt", "popover shirt", "linen shirt"],
    "Tees": ["boxy tee", "layering tee", "rib tee", "relaxed tee"],
    "Hoodies": ["fleece hoodie", "mesh hoodie", "zip hoodie", "weekend hoodie"],
    "Knit Tops": ["ribbed top", "mockneck top", "knit shell", "fine gauge top"],
    "Sweaters": ["crew sweater", "cardigan", "half-zip sweater", "cable sweater"],
    "Blouses": ["gauze blouse", "drape blouse", "button blouse", "silky blouse"],
    "Pants": ["utility pant", "ankle pant", "drawstring pant", "travel pant"],
    "Jeans": ["straight jean", "relaxed jean", "tapered jean", "wide jean"],
    "Skirts": ["midi skirt", "pleated skirt", "wrap skirt", "column skirt"],
    "Slacks": ["tailored slack", "stretch slack", "easy slack", "office slack"],
    "Trousers": ["wide trouser", "high-rise trouser", "pleated trouser", "crop trouser"],
    "Shorts": ["walking short", "linen short", "utility short", "tailored short"],
    "Midi Dresses": ["midi dress", "tiered dress", "day dress", "knit midi"],
    "Shirt Dresses": ["shirt dress", "belted shirt dress", "linen shirt dress", "utility dress"],
    "Sweater Dresses": ["sweater dress", "ribbed dress", "mockneck dress", "knit dress"],
    "Slip Dresses": ["slip dress", "satin dress", "bias dress", "layering dress"],
    "Wrap Dresses": ["wrap dress", "jersey wrap dress", "office wrap dress", "travel wrap dress"],
    "Sneakers": ["walking sneaker", "court sneaker", "commuter sneaker", "mesh sneaker"],
    "Loafers": ["penny loafer", "soft loafer", "platform loafer", "driving loafer"],
    "Boots": ["ankle boot", "chelsea boot", "rain boot", "hiker boot"],
    "Sandals": ["walking sandal", "slide sandal", "strappy sandal", "sport sandal"],
    "Trail Shoes": ["trail shoe", "approach shoe", "light hiker", "grip sneaker"],
    "Backpacks": ["daypack", "commuter backpack", "travel pack", "laptop backpack"],
    "Shoulder Bags": ["shoulder bag", "hobo bag", "bucket bag", "small satchel"],
    "Totes": ["canvas tote", "city tote", "market tote", "shopper bag"],
    "Crossbody Bags": ["crossbody bag", "camera bag", "sling bag", "phone crossbody"],
    "Duffels": ["weekend duffel", "gym duffel", "overnight bag", "packable duffel"],
    "Hats": ["baseball cap", "bucket hat", "beanie", "sun hat"],
    "Scarves": ["wool scarf", "gauze scarf", "travel wrap", "rib scarf"],
    "Wallets": ["card wallet", "zip wallet", "travel wallet", "fold wallet"],
    "Belts": ["leather belt", "webbing belt", "dress belt", "utility belt"],
    "Sunglasses": ["acetate sunglasses", "metal sunglasses", "square sunglasses", "round sunglasses"],
    "Gloves": ["knit gloves", "leather gloves", "fleece gloves", "tech gloves"],
}

ADJECTIVES = [
    "Harbor",
    "Market",
    "Studio",
    "Transit",
    "Cedar",
    "Atlas",
    "Willow",
    "Station",
    "Field",
    "Ridge",
    "Daylight",
    "Quiet",
    "Metro",
    "Foundry",
    "Vista",
    "Northline",
    "Soft",
    "Everyday",
    "Cloud",
    "Terrace",
]

OLD_DIRECT_PRODUCTS = {
    1: ("Northvale Harbor Wool Coat", "Outerwear", "Coats"),
    2: ("Plainworks Saturday Cotton Shirt", "Tops", "Shirts"),
    3: ("Evertrail Rainline Commuter Parka", "Outerwear", "Rain Jackets"),
    4: ("Solen City Mesh Hoodie", "Tops", "Hoodies"),
    5: ("Modura High-Rise Stretch Trouser", "Bottoms", "Trousers"),
    6: ("LumaWeave Air Linen Tee", "Tops", "Tees"),
    7: ("Evertrail Metro Daypack", "Bags", "Backpacks"),
    8: ("Solen Cloudstep Walking Sneaker", "Footwear", "Sneakers"),
    9: ("Northvale Frostline Puffer Vest", "Outerwear", "Vests"),
    10: ("Plainworks Ribbed Mockneck Top", "Tops", "Knit Tops"),
    11: ("Modura Pleated Midi Skirt", "Bottoms", "Skirts"),
    12: ("LumaWeave Linen Shirt Dress", "Dresses", "Shirt Dresses"),
    13: ("Plainworks Soft Rib Long Sleeve", "Tops", "Knit Tops"),
    14: ("LumaWeave Cotton Gauze Blouse", "Tops", "Blouses"),
    15: ("Solen Weekend Fleece Hoodie", "Tops", "Hoodies"),
    16: ("Modura Wide Leg Ponte Pant", "Bottoms", "Pants"),
    17: ("Plainworks Straight Denim Jean", "Bottoms", "Jeans"),
    18: ("Modura Satin Slip Skirt", "Bottoms", "Skirts"),
    19: ("LumaWeave Button Front Midi Dress", "Dresses", "Midi Dresses"),
    20: ("Evertrail Soft Cube Shoulder Bag", "Bags", "Shoulder Bags"),
}

PROFILE_GENDERS = ["female", "male", "nonbinary", "prefer_not_to_say"]
BODY_TYPES = ["petite", "slim", "average", "curvy", "athletic", "broad_shoulders", "tall", "plus"]
CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
SHOE_SIZES = ["6", "7", "8", "9", "10", "11", "12"]
FIT_RESULTS = ["too_small", "slightly_small", "true_to_size", "slightly_large", "too_large", "varies_by_body_type"]

REVIEW_CONTEXTS = [
    "a humid commute",
    "a long office day",
    "school pickup",
    "a weekend trip",
    "a rainy walk",
    "a packed train ride",
    "a dinner reservation",
    "a casual Friday",
    "airport travel",
    "running errands",
    "a full day downtown",
    "a cold morning",
    "a warm afternoon",
    "a conference day",
    "a short hike",
    "a coffee run",
    "a wedding weekend",
    "daily dog walks",
    "a museum visit",
    "a grocery run",
]

OBSERVATION_MARKERS = [
    "the first full day",
    "two separate outings",
    "a week of light use",
    "packing it with my usual essentials",
    "checking it again in daylight",
    "wearing it with a heavier layer",
    "using it on a wet sidewalk",
    "walking several blocks",
    "sitting through meetings",
    "standing through a long line",
    "trying it with older favorites",
    "washing it once",
    "carrying it through transit",
    "wearing it after lunch",
    "using it in a colder room",
    "comparing it with a similar item",
    "checking the seams at home",
    "taking it on a short trip",
    "using it for a casual dinner",
    "trying it in warmer light",
    "wearing it with thin socks",
    "wearing it with thicker socks",
    "loading it more than halfway",
    "wearing it under a coat",
    "using it without babying it",
    "letting it air out overnight",
    "checking the color by a window",
    "walking on smooth floors",
    "walking on rough pavement",
    "packing it for a workday",
    "wearing it for errands",
    "using it during light rain",
    "trying it with a belt",
    "checking the lining",
    "adjusting the strap twice",
    "trying it after a long commute",
    "wearing it around the house first",
    "using it on a crowded train",
    "folding it into a drawer",
    "hanging it overnight",
    "checking photos taken outside",
    "wearing it on stairs",
    "using it with a laptop",
    "wearing it in air conditioning",
    "checking the zipper pull",
    "using the smallest pocket",
    "testing it during a windy walk",
    "wearing it with a backpack",
    "trying it with denim",
    "trying it with work pants",
    "packing it for gym clothes",
    "wearing it in direct sun",
    "using it during a grocery stop",
    "checking it after a second wash",
    "wearing it for a quick coffee run",
    "using it on a travel day",
    "trying it with a dress shirt",
    "trying it with a tee",
    "checking the finish up close",
    "wearing it for a photo",
]

BAG_MARKERS = [
    "packing it with my usual essentials",
    "carrying it through transit",
    "taking it on a short trip",
    "loading it more than halfway",
    "checking the zipper pull",
    "using the smallest pocket",
    "using it with a laptop",
    "packing it for a workday",
    "packing it for gym clothes",
    "using it on a travel day",
    "checking the finish up close",
    "adjusting the strap twice",
]

FOOTWEAR_MARKERS = [
    "walking several blocks",
    "standing through a long line",
    "using it on a wet sidewalk",
    "walking on smooth floors",
    "walking on rough pavement",
    "wearing it with thin socks",
    "wearing it with thicker socks",
    "trying it after a long commute",
    "using it during light rain",
    "wearing it on stairs",
]

POSITIVE_OPENERS = [
    "I reached for it again after",
    "It held up better than expected during",
    "The first real test was",
    "I bought it for",
    "I kept it on through",
    "It made sense immediately during",
    "The best read came after",
    "I was surprised by it during",
]

MIXED_OPENERS = [
    "I like parts of it after",
    "It worked for",
    "There are tradeoffs after",
    "I am keeping it, but",
    "It is not a clean win after",
    "My opinion changed during",
]

NEGATIVE_OPENERS = [
    "The problems showed up during",
    "I wanted to like it, but",
    "It disappointed me on",
    "The return decision came after",
    "The weak points were obvious during",
    "I stopped using it after",
]


def weighted_choice(items):
    total = sum(weight for _, weight in items)
    pick = RNG.uniform(0, total)
    upto = 0
    for value, weight in items:
        if upto + weight >= pick:
            return value
        upto += weight
    return items[-1][0]


def clamp(value, low, high):
    return max(low, min(high, value))


def level(base, spread=1):
    return int(clamp(round(base + RNG.uniform(-spread, spread)), 1, 5))


def material_label(value):
    return value.replace("_", " ").title()


def category_is_clothing(category):
    return category in {"Outerwear", "Tops", "Bottoms", "Dresses"}


def product_price(category, subcategory):
    ranges = {
        "Outerwear": (88, 420),
        "Tops": (24, 140),
        "Bottoms": (38, 170),
        "Dresses": (54, 220),
        "Footwear": (48, 240),
        "Bags": (38, 260),
        "Accessories": (18, 180),
    }
    low, high = ranges[category]
    if subcategory in {"Coats", "Paddings", "Boots", "Duffels"}:
        high *= 1.25
    price = RNG.randrange(low, int(high) + 1)
    return f"{price}.00"


def review_count_for_product(product):
    product_id = product["id"]
    pattern = product["qualityProfile"].get("marketPattern", "steady_catalog")
    if product_id in {1, 8, 33, 64, 108, 151, 220, 301, 388}:
        return RNG.randint(55, 80)
    if pattern == "clean_positive":
        return weighted_choice([(RNG.randint(5, 7), 0.25), (RNG.randint(8, 25), 0.55), (RNG.randint(26, 49), 0.20)])
    if pattern == "quiet_high_potential":
        return RNG.randint(5, 7)
    if pattern == "popular_consensus":
        bucket = weighted_choice([("normal", 0.36), ("busy", 0.34), ("viral", 0.30)])
    elif pattern == "polarizing_fit":
        bucket = weighted_choice([("normal", 0.48), ("busy", 0.35), ("viral", 0.17)])
    elif pattern == "defect_prone":
        bucket = weighted_choice([("normal", 0.62), ("busy", 0.30), ("viral", 0.08)])
    elif pattern == "niche_use":
        bucket = weighted_choice([("low", 0.18), ("normal", 0.66), ("busy", 0.14), ("viral", 0.02)])
    else:
        bucket = weighted_choice([("low", 0.10), ("normal", 0.74), ("busy", 0.12), ("viral", 0.04)])
    if bucket == "low":
        return RNG.randint(5, 7)
    if bucket == "busy":
        return RNG.randint(26, 49)
    if bucket == "viral":
        return RNG.randint(50, 80)
    return RNG.randint(8, 25)


def make_quality_profile():
    pattern = weighted_choice([
        ("popular_consensus", 0.24),
        ("clean_positive", 0.06),
        ("quiet_high_potential", 0.10),
        ("polarizing_fit", 0.18),
        ("niche_use", 0.16),
        ("defect_prone", 0.12),
        ("steady_catalog", 0.20),
    ])
    quality = RNG.betavariate(6.4, 1.9)
    controversy = RNG.betavariate(1.5, 4.8)
    defect = RNG.betavariate(1.2, 6.2)
    fit = RNG.betavariate(1.7, 4.4)
    value = RNG.betavariate(1.4, 5.2)
    if RNG.random() < 0.12:
        controversy = max(controversy, RNG.uniform(0.55, 0.95))
    if RNG.random() < 0.09:
        defect = max(defect, RNG.uniform(0.48, 0.90))
    if RNG.random() < 0.12:
        fit = max(fit, RNG.uniform(0.48, 0.88))
    if pattern == "clean_positive":
        quality = max(quality, RNG.uniform(0.86, 0.98))
        controversy = min(controversy, RNG.uniform(0.04, 0.18))
        defect = min(defect, RNG.uniform(0.02, 0.12))
        fit = min(fit, RNG.uniform(0.08, 0.24))
        value = min(value, RNG.uniform(0.04, 0.22))
    elif pattern == "popular_consensus":
        quality = max(quality, RNG.uniform(0.80, 0.96))
        controversy = min(controversy, RNG.uniform(0.08, 0.32))
        defect = min(defect, RNG.uniform(0.04, 0.24))
    elif pattern == "quiet_high_potential":
        quality = max(quality, RNG.uniform(0.82, 0.95))
        controversy = min(controversy, RNG.uniform(0.10, 0.35))
        defect = min(defect, RNG.uniform(0.04, 0.22))
        fit = min(fit, RNG.uniform(0.12, 0.36))
    elif pattern == "polarizing_fit":
        quality = max(quality, RNG.uniform(0.62, 0.88))
        controversy = max(controversy, RNG.uniform(0.62, 0.95))
        fit = max(fit, RNG.uniform(0.54, 0.90))
    elif pattern == "niche_use":
        quality = max(quality, RNG.uniform(0.66, 0.90))
        controversy = max(controversy, RNG.uniform(0.42, 0.76))
        value = max(value, RNG.uniform(0.30, 0.68))
    elif pattern == "defect_prone":
        quality = min(quality, RNG.uniform(0.38, 0.72))
        defect = max(defect, RNG.uniform(0.52, 0.92))
        value = max(value, RNG.uniform(0.38, 0.78))
    return {
        "qualityScore": round(quality, 2),
        "controversyScore": round(controversy, 2),
        "defectRisk": round(defect, 2),
        "fitRisk": round(fit, 2),
        "valueRisk": round(value, 2),
        "marketPattern": pattern,
    }


def rating_for_profile(profile):
    quality = profile["qualityScore"]
    controversy = profile["controversyScore"]
    defect = profile["defectRisk"]
    value = profile["valueRisk"]
    pattern = profile.get("marketPattern", "steady_catalog")
    positive_bias = clamp(quality - defect * 0.34 - value * 0.16 + RNG.uniform(-0.12, 0.14), 0.05, 0.98)
    if pattern == "clean_positive":
        return weighted_choice([(3, 0.02), (4, 0.25), (5, 0.73)])
    if pattern in {"popular_consensus", "quiet_high_potential"}:
        positive_bias = max(positive_bias, RNG.uniform(0.74, 0.94))
    elif pattern == "defect_prone":
        positive_bias = clamp(positive_bias - RNG.uniform(0.08, 0.24), 0.05, 0.80)
    elif pattern == "niche_use":
        positive_bias = clamp(positive_bias + RNG.uniform(-0.12, 0.08), 0.08, 0.92)

    if pattern == "polarizing_fit" and RNG.random() < controversy * 0.68:
        return weighted_choice([(1, 0.10), (2, 0.13), (3, 0.12), (4, 0.29), (5, 0.36)])
    if pattern == "niche_use" and RNG.random() < controversy * 0.30:
        return weighted_choice([(1, 0.04), (2, 0.09), (3, 0.18), (4, 0.36), (5, 0.33)])
    if controversy > 0.6 and RNG.random() < controversy * 0.55:
        return weighted_choice([(1, 0.08), (2, 0.14), (3, 0.14), (4, 0.28), (5, 0.36)])
    if positive_bias > 0.76:
        return weighted_choice([(1, 0.01), (2, 0.02), (3, 0.05), (4, 0.28), (5, 0.64)])
    if positive_bias > 0.58:
        return weighted_choice([(1, 0.03), (2, 0.05), (3, 0.10), (4, 0.37), (5, 0.45)])
    if positive_bias > 0.40:
        return weighted_choice([(1, 0.06), (2, 0.09), (3, 0.18), (4, 0.39), (5, 0.28)])
    return weighted_choice([(1, 0.15), (2, 0.18), (3, 0.22), (4, 0.27), (5, 0.18)])


def normalize_review_counts(counts):
    total = sum(counts)
    while total < 8000:
        index = RNG.randrange(len(counts))
        if counts[index] < 80:
            counts[index] += 1
            total += 1
    while total > 12000:
        index = RNG.randrange(len(counts))
        if counts[index] > 5:
            counts[index] -= 1
            total -= 1
    return counts


def make_product_name(product_id, brand, category, subcategory):
    if product_id in OLD_DIRECT_PRODUCTS:
        return OLD_DIRECT_PRODUCTS[product_id][0]
    noun = RNG.choice(PRODUCT_NOUNS[subcategory])
    adjective = RNG.choice(ADJECTIVES)
    suffix = RNG.choice(["", " II", " Edit", " Core", " Day", " Flex"])
    return f"{BRAND_LABELS[brand]} {adjective} {noun.title()}{suffix}".replace("  ", " ")


def make_sizes(category):
    if category == "Footwear":
        return SHOE_SIZES
    if category in {"Bags", "Accessories"}:
        return ["One Size"]
    return CLOTHING_SIZES


def make_attributes(category, subcategory, brand, material, color, profile):
    is_footwear = category == "Footwear"
    is_bag = category == "Bags"
    is_accessory = category == "Accessories"
    is_outerwear = category == "Outerwear"
    is_bottom = category == "Bottoms"
    is_dress = category == "Dresses"
    is_top = category == "Tops"

    season = weighted_choice([
        ("spring", 0.18),
        ("summer", 0.16),
        ("fall", 0.24),
        ("winter", 0.18 if not is_outerwear else 0.34),
        ("all_season", 0.24),
    ])
    fit = "adjustable" if is_bag or is_accessory else weighted_choice([("slim", 0.16), ("regular", 0.42), ("relaxed", 0.22), ("oversized", 0.10), ("adjustable", 0.10)])
    style = weighted_choice([("minimal", 0.18), ("classic", 0.22), ("technical", 0.18), ("sporty", 0.12), ("casual", 0.22), ("office", 0.08)])
    occasion = weighted_choice([("commute", 0.20), ("office", 0.16), ("travel", 0.17), ("daily", 0.34), ("workout", 0.13)])
    gender = weighted_choice([("female", 0.25), ("male", 0.20), ("unisex", 0.55)])
    warmth_base = 4.3 if is_outerwear and season == "winter" else 2.0
    if material in {"down", "wool_blend", "fleece"}:
        warmth_base += 1.0
    if material in {"linen_blend", "mesh_knit", "gauze_cotton"}:
        warmth_base -= 1.0
    breath_base = 4.4 if material in {"linen_blend", "mesh_knit", "gauze_cotton", "cotton_poplin"} else 2.8
    if material in {"down", "leather", "technical_shell"}:
        breath_base -= 1.0
    stretch_base = 4.0 if material in {"rib_knit", "ponte_knit", "mesh_knit", "stretch_twill"} else 1.5
    softness_base = 4.2 if material in {"wool_blend", "cotton_jersey", "rib_knit", "fleece", "gauze_cotton"} else 3.0
    durability_base = 3.4 + profile["qualityScore"] * 1.2 - profile["defectRisk"] * 1.0
    comfort_base = 3.2 + profile["qualityScore"] * 1.0 - profile["fitRisk"] * 0.8

    weight = {
        "Outerwear": RNG.randint(480, 1600),
        "Tops": RNG.randint(110, 620),
        "Bottoms": RNG.randint(260, 850),
        "Dresses": RNG.randint(220, 780),
        "Footwear": RNG.randint(420, 1250),
        "Bags": RNG.randint(260, 1800),
        "Accessories": RNG.randint(60, 650),
    }[category]
    capacity = RNG.randint(8, 42) if is_bag else RNG.randint(1, 5) if subcategory in {"Wallets"} else 0
    arch = level(3.5 + profile["qualityScore"] - profile["fitRisk"], 1.2) if is_footwear else 0
    grip = level(3.2 + profile["qualityScore"], 1.1) if is_footwear else 0
    strap = level(3.2 + profile["qualityScore"] - profile["fitRisk"], 1.2) if is_bag else (level(3.0 + profile["qualityScore"], 1.1) if subcategory in {"Belts"} else 0)
    pocket = level(3.3 + profile["qualityScore"], 1.1) if is_bag or subcategory in {"Pants", "Jeans", "Jackets", "Vests"} else 0
    opacity = 0 if is_footwear or is_bag or is_accessory else level(3.4 + profile["qualityScore"] - (0.7 if material in {"gauze_cotton", "linen_blend", "satin"} else 0), 1.0)
    care = level(2.2 + (1.0 if material in {"wool_blend", "silk_blend", "leather", "down"} else 0) + profile["defectRisk"], 1.0)
    length_fit = "not_applicable"
    if category_is_clothing(category) or subcategory in {"Scarves", "Belts", "Gloves"}:
        length_fit = weighted_choice([("short", 0.12), ("regular", 0.56), ("long", 0.14), ("varies_by_height", 0.18)])

    return {
        "brand": brand,
        "material": material,
        "season": season,
        "fit": fit,
        "style": style,
        "occasion": occasion,
        "genderTarget": gender,
        "colorFamily": color,
        "warmthLevel": level(warmth_base, 1.0),
        "comfortLevel": level(comfort_base, 1.1),
        "durabilityLevel": level(durability_base, 1.0),
        "waterproof": bool(is_outerwear and material in {"technical_shell", "softshell", "recycled_nylon"} and RNG.random() < 0.58) or bool(is_footwear and subcategory in {"Boots", "Trail Shoes"} and RNG.random() < 0.35) or bool(is_bag and RNG.random() < 0.20),
        "weightGrams": weight,
        "breathabilityLevel": level(breath_base, 1.1),
        "stretchLevel": level(stretch_base, 1.2),
        "softnessLevel": level(softness_base, 1.0),
        "machineWashable": bool(material not in {"leather", "wool_blend", "silk_blend", "down"} and RNG.random() < 0.72),
        "shoulderStructure": weighted_choice([("soft", 0.22), ("natural", 0.36), ("structured", 0.20), ("dropped", 0.22)]) if is_outerwear or is_top or is_dress else "not_applicable",
        "waistRise": weighted_choice([("low", 0.10), ("mid", 0.45), ("high", 0.45)]) if is_bottom else "not_applicable",
        "toeBoxFit": weighted_choice([("narrow", 0.18), ("regular", 0.58), ("wide", 0.24)]) if is_footwear else "not_applicable",
        "capacityLiters": capacity,
        "archSupportLevel": arch,
        "soleGripLevel": grip,
        "strapComfortLevel": strap,
        "pocketUtilityLevel": pocket,
        "opacityLevel": opacity,
        "careComplexityLevel": care,
        "lengthFit": length_fit,
    }


def make_product(product_id, category, subcategory):
    if product_id in OLD_DIRECT_PRODUCTS:
        _, category, subcategory = OLD_DIRECT_PRODUCTS[product_id]
    brand = BRANDS[(product_id + RNG.randrange(len(BRANDS))) % len(BRANDS)]
    material = RNG.choice(MATERIALS[category])
    color = weighted_choice([(value, 1.0) for value, _ in COLORS])
    quality_profile = make_quality_profile()
    name = make_product_name(product_id, brand, category, subcategory)
    keyword = f"{subcategory.lower()} {material.replace('_', ' ')}"
    desc = f"{name} is a synthetic demo {subcategory.lower()} designed for {RNG.choice(['daily rotation', 'commuting', 'travel', 'office wear', 'weekend errands'])}."
    features = [
        f"Primary material: {material_label(material)}",
        f"Designed for {category.lower()} use",
        f"{RNG.choice(['Balanced', 'Lightweight', 'Structured', 'Soft', 'Weather-aware', 'Easy-care'])} construction",
    ]
    product = {
        "id": product_id,
        "name": name,
        "keyword": keyword,
        "category": category,
        "subCategory": subcategory,
        "price": product_price(category, subcategory),
        "rating": 0,
        "reviewCount": 0,
        "ratingDetail": {},
        "img": f"https://loremflickr.com/600/600/{subcategory.lower().replace(' ', '-')},fashion?lock={50000 + product_id}",
        "brandStory": f"{BRAND_LABELS[brand]} is a synthetic demo brand used for AI-ready shopping data.",
        "desc": desc,
        "sizes": make_sizes(category),
        "colors": [label for _, label in RNG.sample(COLORS, k=3)],
        "features": features,
        "descImages": [f"https://loremflickr.com/600/800/{subcategory.lower().replace(' ', '-')},detail?lock={60000 + product_id}"],
        "brandImages": [f"https://loremflickr.com/1200/400/{brand},fashion?lock={70000 + product_id}"],
        "Material": material_label(material),
        "attributes": make_attributes(category, subcategory, brand, material, color, quality_profile),
        "qualityProfile": quality_profile,
    }
    product["qualityProfile"]["dominantIssueAspects"] = make_issue_profile(category, quality_profile)
    product["qualityProfile"]["targetedComplaint"] = make_targeted_complaint_profile(category, quality_profile)
    return product


def make_profile(review_id, category, rating, product_attrs):
    gender = weighted_choice([("female", 0.43), ("male", 0.32), ("nonbinary", 0.15), ("prefer_not_to_say", 0.10)])
    body_type = weighted_choice([
        ("petite", 0.16),
        ("slim", 0.12),
        ("average", 0.22),
        ("curvy", 0.12),
        ("athletic", 0.11),
        ("broad_shoulders", 0.09),
        ("tall", 0.10),
        ("plus", 0.08),
    ])
    base_height = {
        "petite": 158,
        "slim": 168,
        "average": 169,
        "curvy": 166,
        "athletic": 172,
        "broad_shoulders": 174,
        "tall": 183,
        "plus": 170,
    }[body_type]
    height = int(clamp(round(RNG.gauss(base_height, 6)), 148, 198))
    if category == "Footwear":
        usual = RNG.choice(SHOE_SIZES)
        purchased = usual if RNG.random() < 0.72 else RNG.choice(SHOE_SIZES)
    elif category in {"Bags", "Accessories"}:
        usual = "One Size"
        purchased = "One Size"
    else:
        usual = RNG.choice(CLOTHING_SIZES)
        purchased = usual if RNG.random() < 0.76 else RNG.choice(CLOTHING_SIZES)
    fit_risk = 0.20
    if product_attrs.get("fit") in {"slim", "oversized"}:
        fit_risk += 0.20
    if body_type in {"petite", "broad_shoulders", "tall", "plus"}:
        fit_risk += 0.17
    if rating <= 2 and RNG.random() < 0.50:
        fit_result = weighted_choice([("too_small", 0.35), ("slightly_small", 0.30), ("slightly_large", 0.20), ("too_large", 0.15)])
    elif RNG.random() < fit_risk:
        fit_result = weighted_choice([("slightly_small", 0.35), ("varies_by_body_type", 0.35), ("slightly_large", 0.20), ("too_small", 0.07), ("too_large", 0.03)])
    else:
        fit_result = "true_to_size"
    return {
        "reviewId": review_id,
        "gender": gender,
        "heightCm": height,
        "bodyType": body_type,
        "usualSize": usual,
        "purchasedSize": purchased,
        "fitResult": fit_result,
    }


def choose_evidence_count(rating):
    if rating <= 2:
        return weighted_choice([(2, 0.04), (3, 0.08), (4, 0.16), (5, 0.25), (6, 0.25), (7, 0.15), (8, 0.07)])
    if rating == 3:
        return weighted_choice([(2, 0.03), (3, 0.08), (4, 0.17), (5, 0.25), (6, 0.25), (7, 0.15), (8, 0.07)])
    return weighted_choice([(2, 0.06), (3, 0.12), (4, 0.18), (5, 0.23), (6, 0.22), (7, 0.13), (8, 0.06)])


def choose_sentiment(rating):
    if rating == 5:
        return weighted_choice([("positive", 0.82), ("neutral", 0.14), ("negative", 0.04)])
    if rating == 4:
        return weighted_choice([("positive", 0.68), ("neutral", 0.23), ("negative", 0.09)])
    if rating == 3:
        return weighted_choice([("positive", 0.34), ("neutral", 0.31), ("negative", 0.35)])
    if rating == 2:
        return weighted_choice([("positive", 0.12), ("neutral", 0.23), ("negative", 0.65)])
    return weighted_choice([("positive", 0.07), ("neutral", 0.13), ("negative", 0.80)])


def choose_aspect_for_sentiment(product, sentiment):
    aspects = category_aspects(product["category"])
    quality_profile = product.get("qualityProfile", {})
    issue_focus = quality_profile.get("dominantIssueAspects", [])
    pattern = quality_profile.get("marketPattern", "steady_catalog")
    category_focus = CATEGORY_DEFECT_ASPECTS[product["category"]]

    if sentiment == "negative":
        if pattern == "polarizing_fit":
            issue_probability = 0.60
            category_probability = 0.80
        elif pattern == "niche_use":
            issue_probability = 0.62
            category_probability = 0.80
        elif pattern == "defect_prone":
            issue_probability = 0.84
            category_probability = 0.90
        elif pattern == "quiet_high_potential":
            issue_probability = 0.66
            category_probability = 0.82
        else:
            issue_probability = 0.74
            category_probability = 0.86
        if issue_focus and RNG.random() < issue_probability:
            return RNG.choice(issue_focus)
        if RNG.random() < category_probability:
            return RNG.choice(category_focus)
        return RNG.choice(aspects)

    if sentiment == "neutral":
        if issue_focus and RNG.random() < 0.36:
            return RNG.choice(issue_focus)
        return RNG.choice(aspects)

    positive_pool = [aspect for aspect in aspects if aspect not in issue_focus]
    if positive_pool and RNG.random() < 0.70:
        return RNG.choice(positive_pool)
    return RNG.choice(aspects)


def severity_for_rating(rating):
    if rating == 1:
        return RNG.randint(4, 5)
    if rating == 2:
        return RNG.randint(3, 5)
    if rating == 3:
        return RNG.randint(2, 4)
    return RNG.randint(1, 3)


def evidence_value(attribute_key, attrs):
    value = attrs.get(attribute_key)
    if isinstance(value, bool):
        return {"evidenceValueBoolean": value}
    if isinstance(value, (int, float)):
        return {"evidenceValueNumber": value}
    if value is not None:
        return {"evidenceValueText": str(value)}
    return {}


def category_aspects(category):
    common = ["material", "comfortLevel", "durabilityLevel", "style", "colorFamily", "weightGrams", "careComplexityLevel"]
    if category == "Outerwear":
        return common + ["fit", "warmthLevel", "waterproof", "breathabilityLevel", "shoulderStructure", "lengthFit", "pocketUtilityLevel"]
    if category == "Tops":
        return common + ["fit", "breathabilityLevel", "stretchLevel", "softnessLevel", "opacityLevel", "machineWashable", "shoulderStructure", "lengthFit"]
    if category == "Bottoms":
        return common + ["fit", "stretchLevel", "waistRise", "pocketUtilityLevel", "machineWashable", "lengthFit"]
    if category == "Dresses":
        return common + ["fit", "softnessLevel", "opacityLevel", "machineWashable", "lengthFit", "breathabilityLevel"]
    if category == "Footwear":
        return ["material", "comfortLevel", "durabilityLevel", "style", "colorFamily", "weightGrams", "waterproof", "toeBoxFit", "archSupportLevel", "soleGripLevel", "breathabilityLevel"]
    if category == "Bags":
        return ["material", "durabilityLevel", "style", "colorFamily", "weightGrams", "waterproof", "capacityLiters", "strapComfortLevel", "pocketUtilityLevel"]
    return ["material", "comfortLevel", "durabilityLevel", "style", "colorFamily", "warmthLevel", "weightGrams", "careComplexityLevel", "lengthFit"]


CATEGORY_DEFECT_ASPECTS = {
    "Outerwear": ["fit", "shoulderStructure", "waterproof", "warmthLevel", "breathabilityLevel", "weightGrams", "durabilityLevel", "pocketUtilityLevel", "lengthFit"],
    "Tops": ["fit", "material", "opacityLevel", "breathabilityLevel", "machineWashable", "lengthFit", "softnessLevel", "stretchLevel"],
    "Bottoms": ["fit", "waistRise", "lengthFit", "stretchLevel", "pocketUtilityLevel", "machineWashable", "durabilityLevel"],
    "Dresses": ["fit", "lengthFit", "opacityLevel", "machineWashable", "material", "breathabilityLevel", "softnessLevel"],
    "Footwear": ["toeBoxFit", "archSupportLevel", "soleGripLevel", "comfortLevel", "waterproof", "durabilityLevel", "breathabilityLevel", "weightGrams"],
    "Bags": ["capacityLiters", "strapComfortLevel", "pocketUtilityLevel", "durabilityLevel", "waterproof", "weightGrams", "material"],
    "Accessories": ["fit", "lengthFit", "warmthLevel", "material", "colorFamily", "careComplexityLevel", "weightGrams", "durabilityLevel"],
}


FIT_RELATED_ASPECTS = {"fit", "shoulderStructure", "waistRise", "toeBoxFit", "lengthFit", "strapComfortLevel"}
DEFECT_RELATED_ASPECTS = {"material", "durabilityLevel", "machineWashable", "waterproof", "soleGripLevel", "pocketUtilityLevel", "capacityLiters"}
VALUE_RELATED_ASPECTS = {"style", "colorFamily", "weightGrams", "careComplexityLevel", "comfortLevel"}

TARGETED_BODY_TYPES = {
    "Outerwear": ["petite", "tall", "broad_shoulders", "plus"],
    "Tops": ["petite", "broad_shoulders", "curvy", "plus"],
    "Bottoms": ["petite", "tall", "curvy", "plus"],
    "Dresses": ["petite", "tall", "curvy", "plus"],
    "Footwear": ["athletic", "plus", "average", "tall"],
    "Bags": ["petite", "tall", "average", "plus"],
    "Accessories": ["petite", "tall", "average", "curvy"],
}

TARGETED_COMPLAINT_ASPECTS = {
    "Outerwear": ["fit", "shoulderStructure", "weightGrams", "lengthFit", "breathabilityLevel"],
    "Tops": ["fit", "shoulderStructure", "lengthFit", "opacityLevel", "breathabilityLevel"],
    "Bottoms": ["fit", "waistRise", "lengthFit", "stretchLevel", "pocketUtilityLevel"],
    "Dresses": ["fit", "lengthFit", "opacityLevel", "softnessLevel", "breathabilityLevel"],
    "Footwear": ["toeBoxFit", "archSupportLevel", "soleGripLevel", "comfortLevel", "weightGrams"],
    "Bags": ["strapComfortLevel", "capacityLiters", "pocketUtilityLevel", "weightGrams", "waterproof"],
    "Accessories": ["fit", "lengthFit", "material", "weightGrams", "careComplexityLevel"],
}


def make_issue_profile(category, quality_profile):
    candidates = CATEGORY_DEFECT_ASPECTS[category]
    pattern = quality_profile.get("marketPattern", "steady_catalog")
    if pattern == "polarizing_fit":
        count = weighted_choice([(3, 0.46), (4, 0.40), (5, 0.14)])
    elif pattern == "niche_use":
        count = weighted_choice([(2, 0.46), (3, 0.38), (4, 0.16)])
    elif pattern == "defect_prone":
        count = weighted_choice([(2, 0.38), (3, 0.44), (4, 0.18)])
    elif quality_profile["qualityScore"] > 0.80 and quality_profile["defectRisk"] < 0.24 and quality_profile["fitRisk"] < 0.24:
        count = weighted_choice([(1, 0.75), (2, 0.25)])
    elif quality_profile["controversyScore"] > 0.58 or quality_profile["defectRisk"] > 0.48 or quality_profile["fitRisk"] > 0.48:
        count = weighted_choice([(2, 0.40), (3, 0.40), (4, 0.20)])
    else:
        count = weighted_choice([(1, 0.55), (2, 0.35), (3, 0.10)])

    weights = []
    for aspect in candidates:
        weight = 1.0
        if aspect in FIT_RELATED_ASPECTS:
            weight += quality_profile["fitRisk"] * 3.0
        if aspect in DEFECT_RELATED_ASPECTS:
            weight += quality_profile["defectRisk"] * 3.0
        if aspect in VALUE_RELATED_ASPECTS:
            weight += quality_profile["valueRisk"] * 2.2
        if aspect in {"waterproof", "warmthLevel", "breathabilityLevel"}:
            weight += quality_profile["controversyScore"] * 1.6
        weights.append((aspect, weight))

    selected = []
    while len(selected) < count and weights:
        aspect = weighted_choice(weights)
        if aspect not in selected:
            selected.append(aspect)
        weights = [(candidate, weight) for candidate, weight in weights if candidate != aspect]
    return selected


def make_targeted_complaint_profile(category, quality_profile):
    pattern = quality_profile.get("marketPattern", "steady_catalog")
    body_pool = TARGETED_BODY_TYPES[category]
    aspect_pool = TARGETED_COMPLAINT_ASPECTS[category]
    if pattern == "polarizing_fit":
        body_count = 3
        aspect_count = 3
    elif pattern in {"quiet_high_potential", "popular_consensus"}:
        body_count = weighted_choice([(1, 0.70), (2, 0.30)])
        aspect_count = weighted_choice([(1, 0.62), (2, 0.38)])
    elif pattern == "niche_use":
        body_count = 2
        aspect_count = weighted_choice([(2, 0.70), (3, 0.30)])
    elif pattern == "defect_prone":
        body_count = weighted_choice([(1, 0.55), (2, 0.45)])
        aspect_count = weighted_choice([(1, 0.45), (2, 0.55)])
    else:
        body_count = weighted_choice([(1, 0.72), (2, 0.28)])
        aspect_count = weighted_choice([(1, 0.68), (2, 0.32)])
    return {
        "bodyTypes": RNG.sample(body_pool, k=min(body_count, len(body_pool))),
        "aspects": RNG.sample(aspect_pool, k=min(aspect_count, len(aspect_pool))),
    }


NEGATIVE_ISSUES = {
    "fit": "sizing_issue",
    "material": "scratchy_material",
    "comfortLevel": "uncomfortable_fit",
    "durabilityLevel": "weak_durability",
    "warmthLevel": "too_thin",
    "waterproof": "not_waterproof_enough",
    "breathabilityLevel": "not_breathable",
    "stretchLevel": "sizing_issue",
    "softnessLevel": "scratchy_material",
    "machineWashable": "hard_to_wash",
    "shoulderStructure": "uncomfortable_fit",
    "waistRise": "sizing_issue",
    "toeBoxFit": "sizing_issue",
    "capacityLiters": "insufficient_storage",
    "archSupportLevel": "poor_arch_support",
    "soleGripLevel": "slippery_sole",
    "strapComfortLevel": "strap_discomfort",
    "pocketUtilityLevel": "insufficient_storage",
    "opacityLevel": "see_through",
    "careComplexityLevel": "hard_to_wash",
    "lengthFit": "length_issue",
    "style": "poor_value_for_price",
    "colorFamily": "color_mismatch",
    "weightGrams": "too_heavy",
}


def sentence_for(attribute_key, sentiment, product, profile, review_index):
    attrs = product["attributes"]
    category = product["category"]
    subcategory = product["subCategory"]
    context = RNG.choice(REVIEW_CONTEXTS)
    opener = RNG.choice(POSITIVE_OPENERS if sentiment == "positive" else MIXED_OPENERS if sentiment == "neutral" else NEGATIVE_OPENERS)
    material = material_label(attrs["material"]).lower()
    color = attrs["colorFamily"].replace("_", " ")
    height = profile["heightCm"]
    body = profile["bodyType"].replace("_", " ")
    size = profile["purchasedSize"]
    if category in {"Footwear", "Bags", "Accessories"}:
        wear_word = "used"
    else:
        wear_word = "wore"

    positive = {
        "fit": f"{opener} {context}, and the fit felt predictable for my {body} frame at {height} cm in size {size}.",
        "material": f"The {material} feels considered rather than flimsy, especially after {context}.",
        "comfortLevel": f"I stayed comfortable through {context}, with no distracting pressure points by the end.",
        "durabilityLevel": f"The stitching and hardware still looked tidy after {context}, which made the price easier to accept.",
        "warmthLevel": f"It gave me the right amount of warmth during {context} without feeling bulky.",
        "waterproof": f"Light rain during {context} beaded off better than I expected.",
        "breathabilityLevel": f"It breathed well enough during {context}, so I did not feel trapped or clammy.",
        "stretchLevel": f"The stretch recovered cleanly after {context}, and the shape did not bag out.",
        "softnessLevel": f"The surface felt soft from the first try and stayed pleasant through {context}.",
        "machineWashable": f"After a gentle wash, it came out ready to use again without drama.",
        "shoulderStructure": f"The shoulder line looked intentional on my frame instead of adding bulk.",
        "waistRise": f"The rise sat securely through {context} and did not dig in when I sat down.",
        "toeBoxFit": f"The toe box gave my toes enough room during {context}, which mattered more than I expected.",
        "capacityLiters": f"I could organize my daily carry for {context} without forcing the zipper.",
        "archSupportLevel": f"The arch support stayed noticeable through {context}, not just during the first ten minutes.",
        "soleGripLevel": f"The sole felt planted on slick pavement during {context}.",
        "strapComfortLevel": f"The strap stayed comfortable on my shoulder during {context}.",
        "pocketUtilityLevel": f"The pocket layout made small things easy to find during {context}.",
        "opacityLevel": f"The fabric stayed opaque in daylight, even when I moved around.",
        "careComplexityLevel": f"The care routine is simple enough that I can keep it in regular rotation.",
        "lengthFit": f"The length worked well at {height} cm and did not fight my proportions.",
        "style": f"The design looked cleaner in person than in the photos, especially with my usual casual pieces.",
        "colorFamily": f"The {color} shade was easy to pair and did not look flat indoors.",
        "weightGrams": f"It felt light enough during {context} that I forgot about it after a while.",
    }
    neutral = {
        "fit": f"The fit is usable, but someone between sizes may need to compare measurements before ordering.",
        "material": f"The {material} is decent, though it feels more practical than luxurious.",
        "comfortLevel": f"Comfort was fine for {context}, but I noticed it more by the end of the day.",
        "durabilityLevel": f"Construction looks acceptable, though I would not call it heavy duty yet.",
        "warmthLevel": f"The warmth is moderate, so it depends on whether you run hot or cold.",
        "waterproof": f"It handled mist, but I would not treat it like full storm gear.",
        "breathabilityLevel": f"Breathability is average; fine in mild weather and less ideal when moving fast.",
        "stretchLevel": f"There is some give, but the fabric is not what I would call stretchy.",
        "softnessLevel": f"The hand feel is okay after a wash, not scratchy but not especially plush.",
        "machineWashable": f"Washing was manageable, although I would still use a gentle cycle.",
        "shoulderStructure": f"The shoulder shape is noticeable, so preference will depend on how structured you like it.",
        "waistRise": f"The rise is wearable, but it lands differently depending on torso length.",
        "toeBoxFit": f"The toe box is acceptable for my feet, though wider feet should be cautious.",
        "capacityLiters": f"Capacity works for daily basics, but it is not a weekend packing solution.",
        "archSupportLevel": f"Arch support is present, but I would still add insoles for all-day standing.",
        "soleGripLevel": f"Grip is fine on dry ground and only average when surfaces get slick.",
        "strapComfortLevel": f"The strap is comfortable for light loads and less invisible when packed full.",
        "pocketUtilityLevel": f"The pockets help, though the layout takes a few days to learn.",
        "opacityLevel": f"Opacity is fine in darker colors and more questionable in bright light.",
        "careComplexityLevel": f"Care is not hard, but it is not a toss-anywhere piece either.",
        "lengthFit": f"The length is acceptable for me, but petite or tall shoppers may read it differently.",
        "style": f"The style is simple and wearable, not especially memorable.",
        "colorFamily": f"The {color} color is close to the photos, just a little different under warm light.",
        "weightGrams": f"The weight is noticeable at first but not a deal breaker.",
    }
    negative = {
        "fit": f"The fit became frustrating during {context}; on my {body} frame it pulled in one place and floated in another.",
        "material": f"The {material} felt rougher than expected and made the item seem cheaper in person.",
        "comfortLevel": f"Comfort dropped quickly during {context}, and I kept adjusting it instead of forgetting about it.",
        "durabilityLevel": f"After {context}, loose threads and soft hardware made me question the durability.",
        "warmthLevel": f"It was not warm enough for {context}, even though the product page made it sound more protective.",
        "waterproof": f"Rain during {context} soaked through faster than I expected.",
        "breathabilityLevel": f"It trapped heat during {context} and felt clammy before I got home.",
        "stretchLevel": f"The fabric did not move with me during {context}, so the size felt less forgiving.",
        "softnessLevel": f"The surface felt scratchy after a short time, especially where it touched bare skin.",
        "machineWashable": f"After washing, the shape looked tired and the care instructions felt too optimistic.",
        "shoulderStructure": f"The shoulder shape made me look broader than I wanted.",
        "waistRise": f"The rise shifted when I sat down and never felt secure afterward.",
        "toeBoxFit": f"The toe box pinched during {context}, and I wanted them off before the day was done.",
        "capacityLiters": f"The listed capacity sounded useful, but my everyday items fought for space.",
        "archSupportLevel": f"Arch support was too weak for {context}, so my feet felt tired early.",
        "soleGripLevel": f"The sole slipped on smooth pavement during {context}.",
        "strapComfortLevel": f"The strap dug into my shoulder once the bag had a normal load.",
        "pocketUtilityLevel": f"The pockets look good on paper but made small items harder to reach.",
        "opacityLevel": f"The fabric turned too sheer in daylight, which limited where I could use it.",
        "careComplexityLevel": f"The care routine is fussy enough that I would not reach for it often.",
        "lengthFit": f"The length felt off for my height, either awkwardly cropped or too long to style easily.",
        "style": f"The design looked less refined in person, and the price felt high for the finish.",
        "colorFamily": f"The {color} shade looked different from the photos and threw off the outfits I planned.",
        "weightGrams": f"It felt heavier during {context} than the product description led me to expect.",
    }
    sentence = {"positive": positive, "neutral": neutral, "negative": negative}[sentiment][attribute_key]
    if category == "Bags":
        marker = BAG_MARKERS[review_index % len(BAG_MARKERS)]
    elif category == "Footwear":
        marker = FOOTWEAR_MARKERS[review_index % len(FOOTWEAR_MARKERS)]
    else:
        marker = OBSERVATION_MARKERS[review_index % len(OBSERVATION_MARKERS)]
    sentence = f"{sentence[:-1]} on {product['name']} after {marker}."
    if review_index % 17 == 0 and sentiment != "negative":
        sentence = f"{sentence[:-1]}, which is why I kept reaching for {product['name']}."
    return sentence


def make_evidence(evidence_id, review_id, product, attribute_key, sentiment, sentence, rating):
    issue = "none" if sentiment != "negative" else NEGATIVE_ISSUES.get(attribute_key, "poor_value_for_price")
    severity = 0 if sentiment != "negative" else severity_for_rating(rating)
    item = {
        "id": evidence_id,
        "reviewId": review_id,
        "productId": product["id"],
        "attributeKey": attribute_key,
        "sentiment": sentiment,
        "issueType": issue,
        "severity": severity,
        "evidenceText": sentence,
        "source": "codex-v3",
        "humanReviewStatus": "generated",
    }
    item.update(evidence_value(attribute_key, product["attributes"]))
    return item


def make_title(product, rating, sentiments, profile):
    name = product["name"]
    context = RNG.choice(REVIEW_CONTEXTS)
    if rating >= 5:
        lead = RNG.choice(["A real keeper", "Better than expected", "Worth the space", "Easy favorite", "Surprisingly polished"])
    elif rating == 4:
        lead = RNG.choice(["Strong overall", "Good with a caveat", "Reliable daily option", "Useful but not perfect", "Mostly happy"])
    elif rating == 3:
        lead = RNG.choice(["Mixed results", "Depends on your priorities", "Some wins and misses", "Not bad, not easy", "Check the details"])
    elif rating == 2:
        lead = RNG.choice(["Too many compromises", "Wanted more from it", "Not quite there", "Frustrating in use", "Good idea, weak execution"])
    else:
        lead = RNG.choice(["Returned it", "Did not work for me", "Major miss", "Quality was not there", "Disappointed quickly"])
    if "negative" in sentiments and rating >= 4:
        lead += ", one warning"
    qualifier = weighted_choice([
        ("", 0.50),
        (f" ({profile['bodyType'].replace('_', ' ')} fit)", 0.20),
        (f" in size {profile['purchasedSize']}", 0.16),
        (f" with {profile['fitResult'].replace('_', ' ')} fit", 0.14),
    ])
    return f"{lead} for {name} after {context}{qualifier}"


def should_add_targeted_complaint(product, rating, profile):
    if rating < 4:
        return False
    quality_profile = product.get("qualityProfile", {})
    targeted = quality_profile.get("targetedComplaint", {})
    body_types = set(targeted.get("bodyTypes", []))
    pattern = quality_profile.get("marketPattern", "steady_catalog")
    if pattern == "clean_positive":
        return False
    chance = {
        "clean_positive": 0.00,
        "popular_consensus": 0.26,
        "quiet_high_potential": 0.44,
        "polarizing_fit": 0.58,
        "niche_use": 0.40,
        "defect_prone": 0.30,
        "steady_catalog": 0.18,
    }.get(pattern, 0.18)
    if profile["bodyType"] not in body_types:
        chance *= 0.18
    if product["category"] in {"Bags", "Accessories"}:
        chance *= 0.82
    return RNG.random() < chance


def targeted_complaint_aspect(product):
    targeted = product.get("qualityProfile", {}).get("targetedComplaint", {})
    aspects = targeted.get("aspects", [])
    if aspects and RNG.random() < 0.82:
        return RNG.choice(aspects)
    return choose_aspect_for_sentiment(product, "negative")


def inject_targeted_complaint(selected, product, rating, profile):
    if not should_add_targeted_complaint(product, rating, profile):
        return selected
    aspect = targeted_complaint_aspect(product)
    neutral_slots = [index for index, (_, sentiment) in enumerate(selected) if sentiment == "neutral"]
    positive_slots = [index for index, (_, sentiment) in enumerate(selected) if sentiment == "positive"]
    if len(selected) < 8 and RNG.random() < 0.30:
        selected.append((aspect, "negative"))
    elif neutral_slots:
        selected[RNG.choice(neutral_slots)] = (aspect, "negative")
    elif len(positive_slots) > 1:
        selected[RNG.choice(positive_slots[1:])] = (aspect, "negative")
    elif selected:
        selected[-1] = (aspect, "negative")
    return selected


def remove_clean_positive_complaints(selected, product, rating):
    if product.get("qualityProfile", {}).get("marketPattern") != "clean_positive":
        return selected
    replacement_sentiment = "positive" if rating >= 4 else "neutral"
    return [
        (choose_aspect_for_sentiment(product, replacement_sentiment), replacement_sentiment)
        if sentiment == "negative"
        else (attribute_key, sentiment)
        for attribute_key, sentiment in selected
    ]


def make_review(review_id, product, rating, profile, evidence_start):
    evidence_count = choose_evidence_count(rating)
    selected = []
    while len(selected) < evidence_count:
        sentiment = choose_sentiment(rating)
        aspect = choose_aspect_for_sentiment(product, sentiment)
        if (aspect, sentiment) not in selected or RNG.random() < 0.16:
            selected.append((aspect, sentiment))

    if rating <= 2 and not any(sentiment == "negative" for _, sentiment in selected):
        selected[0] = (choose_aspect_for_sentiment(product, "negative"), "negative")
    if rating >= 4 and not any(sentiment == "positive" for _, sentiment in selected):
        selected[0] = (choose_aspect_for_sentiment(product, "positive"), "positive")
    selected = inject_targeted_complaint(selected, product, rating, profile)
    selected = remove_clean_positive_complaints(selected, product, rating)
    if rating >= 4 and not any(sentiment == "positive" for _, sentiment in selected):
        selected[0] = (choose_aspect_for_sentiment(product, "positive"), "positive")

    sentences = []
    evidence_items = []
    sentiments = []
    for offset, (attribute_key, sentiment) in enumerate(selected):
        sentiments.append(sentiment)
        sentence = sentence_for(attribute_key, sentiment, product, profile, review_id + offset)
        sentences.append(sentence)
        evidence_items.append(make_evidence(evidence_start + offset, review_id, product, attribute_key, sentiment, sentence, rating))

    comment = " ".join(sentences)
    title = make_title(product, rating, sentiments, profile)
    days_back = RNG.randint(5, 540)
    helpful_base = len([item for item in sentiments if item == "negative"]) * 3 + len(sentences)
    helpful_votes = int(max(0, RNG.expovariate(1 / max(1, helpful_base))))
    review = {
        "id": review_id,
        "productId": product["id"],
        "userName": RNG.choice(["Alex", "Morgan", "Jamie", "Taylor", "Riley", "Casey", "Jordan", "Min", "Hannah", "Devon", "Ari", "Sam", "Nora", "Evan", "Mina", "Chris"]) + f" {RNG.randrange(10, 999)}",
        "rating": rating,
        "date": (date.today() - timedelta(days=days_back)).isoformat(),
        "title": title,
        "comment": comment,
        "helpfulVotes": helpful_votes,
        "verifiedPurchase": RNG.random() < 0.91,
        "reviewSource": weighted_choice([("synthetic_demo", 0.88), ("synthetic_mobile", 0.08), ("synthetic_post_purchase_email", 0.04)]),
        "reviewImagesCount": weighted_choice([(0, 0.82), (1, 0.11), (2, 0.05), (3, 0.02)]),
    }
    return review, evidence_items


def rating_detail(reviews):
    counts = Counter(str(review["rating"]) for review in reviews)
    total = len(reviews)
    raw = {str(value): (counts[str(value)] / total) * 100 for value in range(1, 6)}
    detail = {key: math.floor(value) for key, value in raw.items()}
    remainder = 100 - sum(detail.values())
    fractions = sorted(raw, key=lambda key: raw[key] - detail[key], reverse=True)
    for key in fractions[:remainder]:
        detail[key] += 1
    return detail


def build_products():
    products = []
    scheduled = []
    old_counts = Counter(category for _, category, _ in OLD_DIRECT_PRODUCTS.values())
    for product_id in range(1, len(OLD_DIRECT_PRODUCTS) + 1):
        _, category, subcategory = OLD_DIRECT_PRODUCTS[product_id]
        products.append(make_product(product_id, category, subcategory))
    for category, count in CATEGORY_TARGETS.items():
        for _ in range(count - old_counts[category]):
            subcategory = RNG.choice(SUBCATEGORIES[category])
            scheduled.append((category, subcategory))
    scheduled.sort(key=lambda item: (item[0], item[1]))
    RNG.shuffle(scheduled)
    for product_id, (category, subcategory) in enumerate(scheduled, start=len(OLD_DIRECT_PRODUCTS) + 1):
        products.append(make_product(product_id, category, subcategory))
    return products


def generate():
    products = build_products()
    review_counts = normalize_review_counts([review_count_for_product(product) for product in products])
    reviews = []
    profiles = []
    evidence = []
    review_id = 1
    evidence_id = 1
    used_bodies = set()

    for product, review_count in zip(products, review_counts):
        product_reviews = []
        for _ in range(review_count):
            rating = rating_for_profile(product["qualityProfile"])
            profile = make_profile(review_id, product["category"], rating, product["attributes"])
            review, review_evidence = make_review(review_id, product, rating, profile, evidence_id)
            attempts = 0
            while review["comment"] in used_bodies and attempts < 5:
                review, review_evidence = make_review(review_id, product, rating, profile, evidence_id)
                attempts += 1
            if review["comment"] in used_bodies:
                review["comment"] += f" My final note is that this specific use case came after {RNG.choice(REVIEW_CONTEXTS)}."
            used_bodies.add(review["comment"])
            product_reviews.append(review)
            reviews.append(review)
            profiles.append(profile)
            evidence.extend(review_evidence)
            review_id += 1
            evidence_id += len(review_evidence)
        product["reviewCount"] = len(product_reviews)
        product["rating"] = round(sum(review["rating"] for review in product_reviews) / len(product_reviews), 1)
        product["ratingDetail"] = rating_detail(product_reviews)

    return products, reviews, profiles, evidence


def write_batches(products, reviews, profiles, evidence):
    SEED_ROOT.mkdir(parents=True, exist_ok=True)
    for path in SEED_ROOT.glob("batch-v3-*.json"):
        path.unlink()
    reviews_by_product = defaultdict(list)
    profiles_by_review = {profile["reviewId"]: profile for profile in profiles}
    evidence_by_review = defaultdict(list)
    for review in reviews:
        reviews_by_product[review["productId"]].append(review)
    for item in evidence:
        evidence_by_review[item["reviewId"]].append(item)

    batch_size = 15
    for batch_index in range(math.ceil(len(products) / batch_size)):
        batch_products = products[batch_index * batch_size : (batch_index + 1) * batch_size]
        batch_reviews = []
        batch_profiles = []
        batch_evidence = []
        for product in batch_products:
            for review in reviews_by_product[product["id"]]:
                batch_reviews.append(review)
                batch_profiles.append(profiles_by_review[review["id"]])
                batch_evidence.extend(evidence_by_review[review["id"]])
        batch = {
            "batchId": f"batch-v3-{batch_index + 1:03d}",
            "authoredBy": "codex",
            "authoredAt": "2026-05-28",
            "notes": "Amazon AI-ready v3 synthetic fixture. Reviews are synthetic demo prose with randomized product popularity, latent quality profile, rating polarity, evidence counts, and review metadata.",
            "products": batch_products,
            "reviews": batch_reviews,
            "reviewProfiles": batch_profiles,
            "reviewEvidence": batch_evidence,
        }
        path = SEED_ROOT / f"batch-v3-{batch_index + 1:03d}.json"
        path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    products, reviews, profiles, evidence = generate()
    write_batches(products, reviews, profiles, evidence)
    category_counts = Counter(product["category"] for product in products)
    print(
        f"Wrote {math.ceil(len(products) / 15)} v3 batches, {len(products)} products, "
        f"{len(reviews)} reviews, {len(profiles)} profiles, and {len(evidence)} evidence rows."
    )
    print("Category counts:", dict(sorted(category_counts.items())))


if __name__ == "__main__":
    main()
