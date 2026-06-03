import sys
import os
import json
import re

# Dynamically route to the shared folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.models import NlIntentRequest
from shared.env import load_gemini_api_key
from google import genai
from google.genai import types

api_key = load_gemini_api_key()

if not api_key:
    print("WARNING: Could not find GEMINI_API_KEY/GEMINI_KEY/gemini_key. Falling back to the temporary local parser.")
    client = None
else:
    client = genai.Client(api_key=api_key)

TAXONOMY_ALIASES = [
    ("crossbody-bags", "bags", ["crossbody", "cross body", "크로스백", "크로스 바디"]),
    ("backpacks", "bags", ["backpack", "daypack", "백팩"]),
    ("duffels", "bags", ["duffel", "weekender", "더플", "더플백"]),
    ("totes", "bags", ["tote", "토트백"]),
    ("shoulder-bags", "bags", ["shoulder bag", "숄더백"]),
    ("coats", "outerwear", ["coat", "coats", "parka", "trench", "코트", "파카", "트렌치"]),
    ("jackets", "outerwear", ["jacket", "rain jacket", "rainy-day jacket", "자켓", "재킷", "바람막이"]),
    ("paddings", "outerwear", ["puffer", "padding", "패딩"]),
    ("loafers", "footwear", ["loafer", "loafers", "로퍼"]),
    ("sneakers", "footwear", ["sneaker", "sneakers", "running shoe", "운동화"]),
    ("flats", "footwear", ["flat", "flats", "플랫", "플랫슈즈"]),
    ("boots", "footwear", ["boot", "boots", "부츠"]),
    ("dresses", "dresses", ["dress", "dresses", "원피스", "드레스"]),
    ("sweaters", "tops", ["sweater", "knit", "니트", "스웨터"]),
    ("pants", "bottoms", ["pants", "trousers", "바지"]),
    ("skirts", "bottoms", ["skirt", "스커트", "치마"]),
    ("bags", "bags", ["bag", "bags", "가방"]),
    ("footwear", "footwear", ["shoe", "shoes", "신발"]),
    ("outerwear", "outerwear", ["outerwear", "아우터", "겉옷"]),
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _compact(text: str) -> str:
    return re.sub(r"[\W_]+", "", _normalize(text), flags=re.UNICODE)


def _has_any(text: str, terms: list[str]) -> bool:
    normalized = _normalize(text)
    compact = _compact(text)
    for term in terms:
        term_normalized = _normalize(term)
        term_compact = _compact(term)
        if not term_normalized:
            continue
        if " " in term_normalized and term_normalized in normalized:
            return True
        if re.search(r"[가-힣]", term_normalized) and term_compact in compact:
            return True
        if re.search(rf"(?<![a-z0-9]){re.escape(term_normalized)}(?![a-z0-9])", normalized):
            return True
        if len(term_compact) > 5 and term_compact in compact:
            return True
    return False


def _price_limit(text: str) -> float | None:
    patterns = [
        r"(?:<|<=)\s*(?:\$|usd|달러|불)?\s*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)\s*(?:달러|불|usd|\$)?\s*(?:이하|이내|미만|아래|밑|까지|안쪽|안으로|넘지|넘으면\s*싫|넘으면\s*안|넘기면\s*싫)",
        r"(?:under|below|less than|up to|max|maximum|no more than|not over|not above|no higher than)\s*(?:\$|usd|dollars?|bucks?)?\s*(\d+(?:\.\d+)?)",
        r"(?:\$|usd)?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|usd)?\s*(?:or less|and under|or under|and below|max|maximum|cap|budget)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def _temporary_codex_intent(user_prompt: str, error: Exception | None = None) -> str:
    text = user_prompt or ""
    category = None
    product_type = None
    for subcategory, parent, terms in TAXONOMY_ALIASES:
        if _has_any(text, terms):
            category = parent
            product_type = None if subcategory == parent else subcategory
            break

    preferences: list[str] = []
    parsed_criteria: list[dict[str, str | None]] = []
    range_constraints: list[dict[str, str | None]] = []

    if category:
        parsed_criteria.append({"key": "productType", "label": "Product type", "value": product_type or category, "status": "applied"})

    price = _price_limit(text)
    if price is not None:
        numeric = str(int(price)) if price.is_integer() else str(price)
        range_constraints.append({
            "parameter_name": "price",
            "type": "hard_limit",
            "meaning": "explicit maximum price",
            "numeric_interpretation": f"< ${numeric}",
        })
        parsed_criteria.append({"key": "priceMax", "label": "Price", "value": numeric, "status": "applied"})

    mappings = [
        ("season", "winter", ["winter", "cold weather", "겨울", "한겨울", "추운"]),
        ("season", "summer", ["summer", "hot weather", "여름", "더운"]),
        ("occasion", "commute", ["commute", "commuting", "출근", "통근", "출퇴근"]),
        ("occasion", "office", ["office", "work", "회사", "직장", "오피스", "업무"]),
        ("occasion", "travel", ["travel", "airport", "trip", "여행", "공항"]),
        ("occasion", "daily", ["daily", "everyday", "매일", "데일리"]),
        ("waterproof", "true", ["waterproof", "rain", "rainy", "wet", "monsoon", "방수", "비", "장마"]),
        ("toeBoxFit", "wide", ["wide toe", "wide toe box", "roomy toe", "발볼", "앞코 여유"]),
        ("shoulderStructure", "natural", ["avoid broad shoulders", "no broad shoulders", "어깨 넓어", "어깨 부각"]),
        ("strapComfortLevel", "3", ["strap", "strap comfort", "strap shouldn't hurt", "끈", "스트랩", "어깨끈"]),
        ("pocketUtilityLevel", "3", ["pocket", "pockets", "storage", "주머니", "수납", "포켓"]),
        ("opacityLevel", "4", ["opaque", "not see through", "coverage", "비침", "안 비치는"]),
        ("softnessLevel", "4", ["soft", "softness", "부드러운", "부드럽"]),
        ("machineWashable", "true", ["machine washable", "washable", "세탁기", "세탁 가능"]),
        ("soleGripLevel", "3", ["grippy", "grip", "not slippery", "미끄럽", "접지"]),
        ("capacityLiters", "1", ["laptop", "large capacity", "hold my laptop", "노트북", "대용량", "들어가"]),
        ("fit", "relaxed", ["not tight", "relaxed", "loose", "타이트하지", "여유핏", "붙지"]),
    ]
    for key, value, terms in mappings:
        if _has_any(text, terms):
            preferences.append(f"{key}:{value}")
            parsed_criteria.append({"key": key, "label": key, "value": value, "status": "applied"})

    if _has_any(text, ["not too expensive", "not pricey", "affordable", "budget", "cheap", "저렴", "비싸지", "가성비"]):
        preferences.append("budget")

    payload = {
        "intent": "filter_evidence",
        "category": category,
        "productType": product_type,
        "selectedItems": [],
        "preferences": preferences,
        "rangeConstraints": range_constraints,
        "parsedCriteria": parsed_criteria,
        "clarifications": [],
        "temporaryFallback": True,
        "fallbackReason": str(error)[:240] if error else "Gemini unavailable",
    }
    return json.dumps(payload, ensure_ascii=False)


def parse_user_command(user_prompt: str, screen_context: str) -> str:
    """
    Takes an ambiguous user command and visible screen items,
    and returns a structured JSON intent using Gemini 3.1 Flash-Lite.
    """
    
    system_instruction = (
        "You are the Natural Language Request Agent for GroundedCompare, a data-driven e-commerce UI. "
        "Your job is to translate ambiguous user commands into a structured backend API request. "
        "CRITICAL INSTRUCTION: You must perform 'taxonomy-aware and range-aware reasoning'. "
        "The user may write in English or Korean. If the command is Korean, translate the user's product words, "
        "attributes, and subjective constraints into the closest allowed English catalog category/productType/attribute key. "
        "For example, 코트 means coat/coats, 패딩 means puffer/paddings, 백팩 means backpack, 원피스 means dress, "
        "운동화 means sneakers, 출근 means commute, 겨울 means winter, 따뜻한 means warm/warmth, 방수 means waterproof, "
        "가벼운 means lightweight, 편한 means comfortable, 저렴한/가성비 means not too expensive, 후기 좋은 means good reviews. "
        "Use only categories, product types, and attribute keys that appear in Screen Context. "
        "When a user says a product word such as coat, puffer, backpack, tote, sneaker, boot, dress, shirt, pants, scarf, hat, or sunglasses, "
        "map it to the closest catalog category/productType from Screen Context instead of inventing a new label. "
        "When a user describes attributes such as waterproof, machine washable, warm, breathable, soft, stretchy, lightweight, wide toe box, arch support, grippy sole, pockets, opaque, easy care, fit, material, color, gender, season, or occasion, "
        "put the concrete attribute phrase in `preferences` so the backend can ground it against catalog attributes. "
        "Also populate `parsedCriteria` with the user's decomposed criteria. Use `status='applied'` for clear constraints, "
        "`status='ambiguous'` for subjective terms such as beautiful, not too expensive, office-appropriate, or easy to move in, "
        "and `status='open'` when the user left a relevant comparison criterion unspecified. "
        "Populate `clarifications` only for ambiguous criteria that a user should be able to adjust before or during result loading. "
        "You must perform range-aware reasoning. When a user uses subjective terms "
        "(e.g., 'not too expensive', 'highly rated', 'lightweight'), you must map them into the `rangeConstraints` "
        "dictionary. You must provide a concrete, logical `numeric_interpretation` (e.g., '< $120' or 'top 30%') "
        "for the backend to execute. Do not leave subjective terms as vague preferences. "
        "For `selectedItems`, map exact screen numbers to 'visible_number' and descriptive phrases to 'attribute_query'. "
        "Strictly output valid JSON matching the requested schema without markdown or conversational filler."
    )
    
    prompt = f"""
    Screen Context (Visible Items and general price/rating ranges):
    {screen_context}
    
    User Command: {user_prompt}
    
    Analyze the command. If subjective constraints exist, assign realistic numeric boundaries based on standard e-commerce expectations.
    """
    
    if client is None:
        return _temporary_codex_intent(user_prompt)

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=NlIntentRequest,
                temperature=0.0
            ),
        )

        return response.text
    except Exception as error:
        return _temporary_codex_intent(user_prompt, error)

# --- Example Usage ---
if __name__ == "__main__":
    # Updated mock context to match the "winter coats" query
    mock_screen_context = (
        "Current Category: Outerwear. Price range on screen: $45 to $350. Average rating: 4.1.\n"
        "- ID: coat_01, Name: North Face Parka, Price: $299, Rating: 4.8, Position: Top Left\n"
        "- ID: coat_02, Name: Basic Wool Blend, Price: $89, Rating: 3.5, Position: Top Right\n"
        "- ID: coat_03, Name: Columbia Puffer, Price: $110, Rating: 4.5, Position: Bottom Left\n"
    )
    
    mock_user_command = "Show me warm winter coats that are not too expensive and have good reviews"
    
    result = parse_user_command(mock_user_command, mock_screen_context)
    print(result)
