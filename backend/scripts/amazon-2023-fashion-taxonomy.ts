type ProductRow = Record<string, unknown>;

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function compactPath(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function rawCategoryPath(value: unknown) {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }
  if (value.every((item) => typeof item === "string")) {
    return value.map(String).filter(Boolean);
  }
  const firstPath = value.find((item) => Array.isArray(item)) as unknown[] | undefined;
  return firstPath?.filter((item) => typeof item === "string").map(String) ?? [];
}

function rowText(row: ProductRow) {
  const details = safeObject(row.details);
  const parts = [
    safeString(row.title),
    ...safeArray(row.features).map((value) => safeString(value)),
    ...safeArray(row.description).map((value) => safeString(value)),
    ...Object.values(details).map((value) => safeString(value)),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function department(row: ProductRow, text: string) {
  const details = safeObject(row.details);
  const raw = [safeString(details.Department), safeString(details["Age Range (Description)"])].filter(Boolean).join(" ").toLowerCase();
  const scoped = `${raw} ${text}`;
  if (/\b(girls?|toddler girls?|little girls?)\b/.test(scoped)) return "Girls";
  if (/\b(boys?|toddler boys?|little boys?)\b/.test(scoped)) return "Boys";
  if (/\b(baby|infant|newborn)\b/.test(scoped)) return "Baby";
  if (/\b(women'?s|womens|woman|female|ladies|lady)\b/.test(scoped)) return "Women";
  if (/\b(men'?s|mens|man|male)\b/.test(scoped)) return "Men";
  if (/\bunisex\b/.test(scoped)) return "Unisex";
  return "Unisex";
}

function productGroup(text: string) {
  if (/\b(handbag|purse|tote|backpack|crossbody|clutch|wallet|shoulder bag|satchel|duffel|bag)\b/.test(text)) return "Bags";
  if (/\b(shoe|sneaker|boot|sandal|slipper|loafer|heel|pump|flat|clog|mule|footwear)\b/.test(text)) return "Shoes";
  if (/\b(necklace|ring|earrings?|bracelet|jewelry|pendant|anklet)\b/.test(text)) return "Jewelry";
  if (/\b(watch|watches)\b/.test(text)) return "Watches";
  if (/\b(glove|hat|cap|scarf|belt|sunglasses|necktie|bowtie|tie clip|tie bar|compression (?:arm |leg |calf |tube )?sleeves?|arm sleeves?|calf sleeves?|mask)\b/.test(text)) return "Accessories";
  return "Clothing";
}

function leafCategory(group: string, text: string) {
  if (group === "Bags") {
    if (/\bbackpack\b/.test(text)) return "Backpacks";
    if (/\btote\b/.test(text)) return "Totes";
    if (/\bshoulder bag\b/.test(text)) return "Shoulder Bags";
    if (/\bcrossbody\b/.test(text)) return "Crossbody Bags";
    if (/\bwallet\b/.test(text)) return "Wallets";
    if (/\bclutch\b/.test(text)) return "Clutches";
    return "Handbags";
  }

  if (group === "Shoes") {
    if (/\bboot/.test(text)) return "Boots";
    if (/\bsneaker|running shoe|walking shoe|athletic shoe\b/.test(text)) return "Sneakers";
    if (/\bsandal\b/.test(text)) return "Sandals";
    if (/\bloafer\b/.test(text)) return "Loafers";
    if (/\bheel|pump\b/.test(text)) return "Heels";
    if (/\bflat\b/.test(text)) return "Flats";
    if (/\bslipper\b/.test(text)) return "Slippers";
    return "Shoes";
  }

  if (group === "Jewelry") {
    if (/\bring\b/.test(text)) return "Rings";
    if (/\bearrings?\b/.test(text)) return "Earrings";
    if (/\bnecklace|pendant\b/.test(text)) return "Necklaces";
    if (/\bbracelet|anklet\b/.test(text)) return "Bracelets";
    return "Jewelry";
  }

  if (group === "Watches") {
    return "Watches";
  }

  if (group === "Accessories") {
    if (/\bglove\b/.test(text)) return "Gloves";
    if (/\bhat|cap\b/.test(text)) return "Hats & Caps";
    if (/\bscarf\b/.test(text)) return "Scarves";
    if (/\bbelt\b/.test(text)) return "Belts";
    if (/\bsunglasses\b/.test(text)) return "Sunglasses";
    if (/\bnecktie|bowtie|tie clip|tie bar\b/.test(text)) return "Ties";
    if (/\bcompression (?:arm |leg |calf |tube )?sleeves?|arm sleeves?|calf sleeves?\b/.test(text)) return "Compression Sleeves";
    return "Accessories";
  }

  if (/\bsock/.test(text)) return "Socks";
  if (/\b(pants?|trouser|jeans|leggings|palazzo)\b/.test(text)) return "Pants";
  if (/\bdress|gown\b/.test(text)) return "Dresses";
  if (/\b(coat|jacket|parka|anorak|windbreaker|raincoat|blazer)\b/.test(text)) return "Coats & Jackets";
  if (/\b(hoodie|sweatshirt)\b/.test(text)) return "Hoodies & Sweatshirts";
  if (/\bsweater|cardigan\b/.test(text)) return "Sweaters";
  if (/\b(shirt|blouse|tee|t-shirt|tank|top)\b/.test(text)) return "Tops & Shirts";
  if (/\bskirt\b/.test(text)) return "Skirts";
  if (/\bshorts?\b/.test(text)) return "Shorts";
  if (/\bunderwear|briefs?|bra|panties|boxer|lingerie\b/.test(text)) return "Underwear";
  if (/\bswim|bikini|swimsuit\b/.test(text)) return "Swimwear";
  if (/\bpajama|pyjama|sleepwear|lounge\b/.test(text)) return "Sleepwear & Lounge";
  if (/\b(activewear|workout|yoga|athletic|compression)\b/.test(text)) return "Activewear";
  if (/\bsuit|tuxedo\b/.test(text)) return "Suits & Blazers";
  return "Clothing";
}

export function fashionCategoryPath(row: ProductRow) {
  const raw = rawCategoryPath(row.categories);
  if (raw.length) {
    return raw;
  }

  const text = rowText(row);
  const group = productGroup(text);
  return compactPath(["Amazon Fashion", department(row, text), group, leafCategory(group, text)]);
}
