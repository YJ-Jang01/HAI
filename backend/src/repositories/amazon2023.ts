import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  shoppingCategories,
  shoppingDatasets,
  shoppingProductAttributes,
  shoppingProductCategoryPaths,
  shoppingProductImages,
  shoppingProducts,
  shoppingProductSearchDocuments,
  shoppingProductSemanticAttributes,
  shoppingReviewEvidence,
  shoppingReviews,
} from "../db/schema.js";

export type Amazon2023Sort = "title_asc" | "price_asc" | "price_desc" | "rating_desc" | "review_count_desc";
export type Amazon2023ProductView = "card" | "detail";

export type Amazon2023ProductFilters = {
  datasetSlug?: string;
  query?: string;
  category?: string;
  subCategory?: string;
  color?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  genderTarget?: string;
  occasion?: string;
  season?: string;
  material?: string;
  style?: string;
  sleeveLength?: string;
  warmthLevelMin?: number;
  comfortLevelMin?: number;
  durabilityLevelMin?: number;
  careEaseLevelMin?: number;
  waterproof?: boolean;
  semanticConfidenceMin?: number;
};

export type Amazon2023ProductSearchParams = Amazon2023ProductFilters & {
  limit: number;
  offset: number;
  sort: Amazon2023Sort;
  view?: Amazon2023ProductView;
};

type ShoppingDataset = typeof shoppingDatasets.$inferSelect;
type ShoppingProduct = typeof shoppingProducts.$inferSelect;

function nullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const COLOR_GROUPS: Record<string, { label: string; aliases: string[] }> = {
  black: { label: "Black", aliases: ["black", "charcoal", "ebony", "jet"] },
  white: { label: "White", aliases: ["white", "ivory", "cream", "pearl"] },
  gray: { label: "Gray", aliases: ["gray", "grey", "silver", "slate", "graphite", "ash", "pewter"] },
  brown: { label: "Brown", aliases: ["brown", "chocolate", "coffee", "espresso", "mocha"] },
  tan: { label: "Tan", aliases: ["tan", "beige", "khaki", "camel", "sand", "taupe", "stone"] },
  green: { label: "Green", aliases: ["green", "olive", "mint", "sage", "emerald", "moss", "pine"] },
  blue: { label: "Blue", aliases: ["blue", "navy", "denim", "cobalt", "teal", "aqua", "royal"] },
  red: { label: "Red", aliases: ["red", "maroon", "burgundy", "wine", "ruby", "cherry", "berry"] },
  yellow: { label: "Yellow", aliases: ["yellow", "gold", "mustard", "lemon"] },
  pink: { label: "Pink", aliases: ["pink", "rose", "blush", "fuchsia", "magenta"] },
  purple: { label: "Purple", aliases: ["purple", "lavender", "violet", "lilac", "plum"] },
  orange: { label: "Orange", aliases: ["orange", "coral", "peach", "copper", "pumpkin", "amber"] },
};

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "under",
  "with",
  "괜찮은",
  "괜찮",
  "보여줘",
  "예쁜",
  "이쁜",
  "좋은",
  "추천",
  "찾아줘",
]);

const SEARCH_QUERY_ALIASES: Record<string, string[]> = {
  "가방": ["bag", "bags", "tote", "backpack"],
  "가벼운": ["lightweight"],
  "겨울": ["winter", "warm"],
  "구두": ["dress shoes", "shoe", "shoes", "footwear", "loafer", "heel", "pump", "oxford", "flat"],
  "남성": ["men", "mens", "male"],
  "남성용": ["men", "mens", "male"],
  "남자": ["men", "mens", "male"],
  "니트": ["knit", "sweater", "sweaters"],
  "데일리": ["daily", "casual"],
  "드레스": ["dress", "dresses"],
  "따뜻한": ["warm", "winter"],
  "면접": ["interview", "office", "formal", "dress shoes"],
  "면접용": ["interview", "office", "formal", "dress shoes"],
  "로퍼": ["loafer", "loafers", "footwear"],
  "린넨": ["linen"],
  "면": ["cotton"],
  "모자": ["hat", "hats", "cap"],
  "바지": ["pants", "trousers", "slacks"],
  "반바지": ["shorts"],
  "반소매": ["short sleeve", "short-sleeve", "tee", "t-shirt", "shirt"],
  "반팔": ["short sleeve", "short-sleeve", "tee", "t-shirt", "shirt"],
  "반팔티": ["short sleeve", "short-sleeve", "tee", "t-shirt", "shirt"],
  "방수": ["waterproof", "water resistant", "weather"],
  "백팩": ["backpack", "daypack", "pack"],
  "부츠": ["boots", "footwear"],
  "바캉스": ["vacation", "resort", "beach", "summer", "travel"],
  "블라우스": ["blouse", "blouses"],
  "셔츠": ["shirt", "shirts", "top", "tops", "tee", "t-shirt"],
  "스니커즈": ["sneaker", "sneakers", "shoes", "footwear"],
  "스웨터": ["sweater", "sweaters"],
  "스카프": ["scarf", "scarves"],
  "스커트": ["skirt", "skirts"],
  "슬랙스": ["slacks", "pants", "trousers"],
  "신발": ["shoe", "shoes", "footwear", "sneaker", "boot"],
  "아우터": ["outerwear", "coat", "jacket"],
  "여름": ["summer", "breathable", "lightweight"],
  "여름용": ["summer", "breathable", "lightweight"],
  "여성": ["women", "womens", "female"],
  "여성용": ["women", "womens", "female"],
  "여자": ["women", "womens", "female"],
  "운동화": ["sneaker", "sneakers", "shoes", "footwear"],
  "원피스": ["dress", "dresses"],
  "파티": ["party", "event", "evening"],
  "파티용": ["party", "event", "evening"],
  "피서": ["vacation", "resort", "beach", "summer", "travel"],
  "피서용": ["vacation", "resort", "beach", "summer", "travel"],
  "자켓": ["jacket", "jackets", "outerwear"],
  "재킷": ["jacket", "jackets", "outerwear"],
  "청바지": ["jeans", "denim"],
  "출근": ["commute", "office"],
  "출근용": ["commute", "office"],
  "휴가": ["vacation", "resort", "beach", "summer", "travel"],
  "코트": ["coat", "coats", "outerwear"],
  "티": ["tee", "tees", "t-shirt", "shirt"],
  "티셔츠": ["tee", "tees", "t-shirt", "shirt"],
  "편한": ["comfortable", "comfort"],
  "후드": ["hoodie", "hoodies"],
  "후드티": ["hoodie", "hoodies"],
};

function arrayFromUnknown(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,/|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function detailValues(details: Record<string, unknown>, keys: string[]) {
  const normalizedKeys = keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  const directValues = keys.flatMap((key) => arrayFromUnknown(details[key] ?? details[key.toLowerCase()] ?? details[key.replace(/\s+/g, "_").toLowerCase()]));
  if (directValues.length) {
    return directValues;
  }
  for (const [key, value] of Object.entries(details)) {
    if (normalizedKeys.includes(key.toLowerCase().replace(/[^a-z0-9]+/g, ""))) {
      return arrayFromUnknown(value);
    }
  }
  return [];
}

function displayCategoryFromPath(path: string[]) {
  return path.length > 1 ? path[1] : path[0] ?? null;
}

function displaySubCategoryFromPath(path: string[]) {
  return path.length > 2 ? path[path.length - 1] : path[1] ?? path[0] ?? null;
}

function taxonomyText(path: string[], title: string | null | undefined, mainCategory: string | null | undefined) {
  return [...path, title ?? "", mainCategory ?? ""].join(" ").toLowerCase();
}

function inferProductType(path: string[], title: string | null | undefined, mainCategory: string | null | undefined) {
  const text = taxonomyText(path, title, mainCategory);
  const rules: Array<[string, RegExp]> = [
    ["Backpacks", /\b(backpack|daypack)\b/],
    ["Crossbody Bags", /\bcrossbody\b/],
    ["Totes", /\b(tote|shopper)\b/],
    ["Duffels", /\bduffel\b/],
    ["Coats", /\b(coat|parka|pea coat|overcoat)\b/],
    ["Rain Jackets", /\b(raincoat|rain jacket)\b/],
    ["Windbreakers", /\bwindbreaker\b/],
    ["Jackets", /\b(jacket|blazer|anorak)\b/],
    ["Boots", /\bboot\b/],
    ["Sneakers", /\b(sneaker|running shoe|athletic shoe|trainer)\b/],
    ["Sandals", /\bsandal\b/],
    ["Loafers", /\bloafer\b/],
    ["Heels", /\b(heel|pump)\b/],
    ["Flats", /\bflat\b/],
    ["Oxfords", /\boxford\b/],
    ["Slippers", /\bslipper\b/],
    ["Shirt Dresses", /\bshirt dress\b/],
    ["Dresses", /\bdress\b/],
    ["Blouses", /\bblouse\b/],
    ["Tees", /\b(t[- ]?shirt|tee)\b/],
    ["Shirts", /\b(button[- ]?down|shirt)\b/],
    ["Sweaters", /\b(sweater|cardigan)\b/],
    ["Hoodies", /\bhoodie\b/],
    ["Pants", /\b(pants|trouser|trousers|slacks|leggings)\b/],
    ["Jeans", /\bjeans\b/],
    ["Shorts", /\bshorts\b/],
    ["Skirts", /\bskirt\b/],
    ["Hats & Caps", /\b(cap|hat|beanie)\b/],
    ["Scarves", /\bscarf\b/],
    ["Gloves", /\bglove\b/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? displaySubCategoryFromPath(path);
}

function inferParentCategory(path: string[], title: string | null | undefined, mainCategory: string | null | undefined) {
  const text = taxonomyText(path, title, mainCategory);
  if (/\b(shoe|sneaker|boot|sandal|slipper|loafer|heel|pump|flat|oxford|footwear)\b/.test(text)) return "Footwear";
  if (/\b(coat|jacket|parka|anorak|windbreaker|raincoat|blazer|outerwear)\b/.test(text)) return "Outerwear";
  if (/\b(backpack|bag|tote|crossbody|duffel|handbag|purse)\b/.test(text)) return "Bags";
  if (/\b(dress|gown)\b/.test(text)) return "Dresses";
  if (/\b(shirt|tee|t[- ]?shirt|blouse|top|sweater|hoodie|cardigan|sweatshirt)\b/.test(text)) return "Tops";
  if (/\b(pants|trouser|trousers|jeans|slacks|leggings|shorts|skirt)\b/.test(text)) return "Bottoms";
  if (/\b(cap|hat|beanie|scarf|glove|belt|wallet|sunglasses|watch|jewelry)\b/.test(text)) return "Accessories";
  return displayCategoryFromPath(path);
}

function normalizeColorGroup(value: string) {
  const text = value.toLowerCase();
  for (const group of Object.values(COLOR_GROUPS)) {
    if (group.aliases.some((alias) => text.includes(alias))) {
      return group.label;
    }
  }
  return value.trim();
}

function colorAliases(value: string) {
  const direct = Object.values(COLOR_GROUPS).find((group) => group.label.toLowerCase() === value.toLowerCase());
  return direct ? [direct.label, ...direct.aliases] : [value];
}

function baseSearchTokens(query: string) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !/^\d+(\.\d+)?$/.test(token) && !SEARCH_STOP_WORDS.has(token));
}

function aliasSearchTerms(query: string) {
  const terms = baseSearchTokens(query).flatMap((token) => [token, ...(SEARCH_QUERY_ALIASES[token] ?? [])]);
  return [...new Set(terms.map((term) => term.toLowerCase().trim()).filter(Boolean))].slice(0, 24);
}

function normalizeSearchTokens(query: string) {
  return [...new Set(aliasSearchTerms(query).flatMap((term) => term.replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)).filter((token) => token.length > 1))].slice(0, 24);
}

export async function getActiveAmazon2023Dataset(datasetSlug?: string) {
  if (datasetSlug) {
    const [dataset] = await db
      .select()
      .from(shoppingDatasets)
      .where(eq(shoppingDatasets.slug, datasetSlug))
      .limit(1);
    return dataset ?? null;
  }

  const [dataset] = await db
    .select()
    .from(shoppingDatasets)
    .where(eq(shoppingDatasets.isActive, true))
    .orderBy(desc(shoppingDatasets.updatedAt))
    .limit(1);
  return dataset ?? null;
}

function categoryPathFilter(dataset: ShoppingDataset, value: string) {
  const pattern = `%${value}%`;
  return sql`exists (
    select 1
    from ${shoppingProductCategoryPaths}
    inner join ${shoppingCategories} on ${shoppingCategories.id} = ${shoppingProductCategoryPaths.categoryId}
    where ${shoppingProductCategoryPaths.productId} = ${shoppingProducts.id}
    and ${shoppingCategories.datasetId} = ${dataset.id}
    and (
      ${shoppingCategories.slug} = ${value}
      or ${shoppingCategories.sourcePath} = ${value}
      or ${shoppingCategories.name} ilike ${pattern}
    )
  )`;
}

function subCategoryPathFilter(dataset: ShoppingDataset, value: string) {
  const normalized = value.toLowerCase();
  return sql`exists (
    select 1
    from ${shoppingProductCategoryPaths}
    inner join ${shoppingCategories} on ${shoppingCategories.id} = ${shoppingProductCategoryPaths.categoryId}
    where ${shoppingProductCategoryPaths.productId} = ${shoppingProducts.id}
    and ${shoppingCategories.datasetId} = ${dataset.id}
    and (
      lower(${shoppingCategories.slug}) = ${normalized}
      or lower(${shoppingCategories.sourcePath}) = ${normalized}
      or lower(${shoppingCategories.name}) = ${normalized}
    )
  )`;
}

function productTypePatterns(value: string) {
  const normalized = value.toLowerCase();
  const patterns: Record<string, { include: string[]; exclude?: string[] }> = {
    coats: { include: ["%coat%", "%parka%", "%overcoat%"], exclude: ["%jacket%", "%blazer%", "%windbreaker%"] },
    jackets: { include: ["%jacket%", "%blazer%", "%windbreaker%", "%anorak%"], exclude: ["%coat%"] },
    "rain jackets": { include: ["%rain jacket%", "%raincoat%", "%rain coat%"] },
    windbreakers: { include: ["%windbreaker%"] },
    shirts: { include: ["%shirt%", "%button down%", "%button-down%"], exclude: ["%sweatshirt%", "%t-shirt%", "%tee%"] },
    tees: { include: ["%t-shirt%", "%tee%", "%tees%"] },
    blouses: { include: ["%blouse%"] },
    sweaters: { include: ["%sweater%", "%cardigan%", "%knit%"] },
    hoodies: { include: ["%hoodie%", "%hooded%", "%sweatshirt%"] },
    boots: { include: ["%boot%"] },
    sneakers: { include: ["%sneaker%", "%running shoe%", "%athletic shoe%", "%trainer%"] },
    sandals: { include: ["%sandal%"] },
    loafers: { include: ["%loafer%"] },
    heels: { include: ["%heel%", "%pump%"] },
    flats: { include: ["%flat%"] },
    oxfords: { include: ["%oxford%"] },
    pants: { include: ["%pants%", "%trouser%", "%slacks%", "%leggings%"] },
    jeans: { include: ["%jeans%", "%denim%"] },
    shorts: { include: ["%shorts%"] },
    skirts: { include: ["%skirt%"] },
    dresses: { include: ["%dress%"] },
    backpacks: { include: ["%backpack%", "%daypack%"] },
    "crossbody bags": { include: ["%crossbody%"] },
    totes: { include: ["%tote%", "%shopper%"] },
  };
  return patterns[normalized];
}

function productTypeTextFilter(value: string) {
  const config = productTypePatterns(value);
  if (!config) {
    return undefined;
  }
  const positive = or(
    ...config.include.map((pattern) => sql`${shoppingProducts.title} ilike ${pattern}`),
  )!;
  const excludePatterns = config.exclude ?? [];
  if (!excludePatterns.length) {
    return positive;
  }
  return and(
    positive,
    ...excludePatterns.map((pattern) => sql`${shoppingProducts.title} not ilike ${pattern}`),
  )!;
}

function productTypeFilter(dataset: ShoppingDataset, value: string) {
  return productTypeTextFilter(value) ?? subCategoryPathFilter(dataset, value);
}

function colorFilter(value: string) {
  const aliases = colorAliases(value);
  const patterns = aliases.map((alias) => `%${alias}%`);
  return or(
    ...patterns.map((pattern) => sql`exists (
      select 1
      from ${shoppingProductAttributes}
      where ${shoppingProductAttributes.productId} = ${shoppingProducts.id}
      and (
        ${shoppingProductAttributes.key} ilike '%color%'
        or ${shoppingProductAttributes.label} ilike '%color%'
        or ${shoppingProductAttributes.sourcePath} ilike '%color%'
      )
      and ${shoppingProductAttributes.valueText} ilike ${pattern}
    )`),
    ...patterns.map((pattern) => sql`${shoppingProducts.details}::text ilike ${pattern}`),
  )!;
}

function queryFilter(value: string) {
  const pattern = `%${value}%`;
  const tokens = normalizeSearchTokens(value);
  const tsQuery = tokens.map((token) => `${token.replace(/[':!&|()*]/g, "")}:*`).filter(Boolean).join(" | ");
  const aliasPatterns = aliasSearchTerms(value).map((term) => `%${term}%`).slice(0, 24);
  const conditions: SQL[] = [];
  if (tsQuery) {
    conditions.push(sql`exists (
      select 1
      from ${shoppingProductSearchDocuments}
      where ${shoppingProductSearchDocuments.productId} = ${shoppingProducts.id}
      and ${shoppingProductSearchDocuments.searchVector} @@ to_tsquery('simple', ${tsQuery})
    )`);
  }
  conditions.push(sql`exists (
    select 1
    from ${shoppingProductSearchDocuments}
    where ${shoppingProductSearchDocuments.productId} = ${shoppingProducts.id}
    and ${shoppingProductSearchDocuments.searchText} ilike ${pattern}
  )`);
  for (const aliasPattern of aliasPatterns) {
    conditions.push(sql`exists (
      select 1
      from ${shoppingProductSearchDocuments}
      where ${shoppingProductSearchDocuments.productId} = ${shoppingProducts.id}
      and ${shoppingProductSearchDocuments.searchText} ilike ${aliasPattern}
    )`);
  }
  return or(...conditions)!;
}

function semanticConfidence(params: Amazon2023ProductFilters) {
  return params.semanticConfidenceMin ?? 0.2;
}

function semanticTextFilter(dataset: ShoppingDataset, key: string, value: string, params: Amazon2023ProductFilters) {
  return sql`exists (
    select 1
    from ${shoppingProductSemanticAttributes}
    where ${shoppingProductSemanticAttributes.productId} = ${shoppingProducts.id}
    and ${shoppingProductSemanticAttributes.datasetId} = ${dataset.id}
    and ${shoppingProductSemanticAttributes.key} = ${key}
    and lower(${shoppingProductSemanticAttributes.valueText}) = lower(${value})
    and ${shoppingProductSemanticAttributes.confidence} >= ${String(semanticConfidence(params))}
  )`;
}

function semanticNumberMinFilter(dataset: ShoppingDataset, key: string, value: number, params: Amazon2023ProductFilters) {
  return sql`exists (
    select 1
    from ${shoppingProductSemanticAttributes}
    where ${shoppingProductSemanticAttributes.productId} = ${shoppingProducts.id}
    and ${shoppingProductSemanticAttributes.datasetId} = ${dataset.id}
    and ${shoppingProductSemanticAttributes.key} = ${key}
    and ${shoppingProductSemanticAttributes.valueNumber} >= ${String(value)}
    and ${shoppingProductSemanticAttributes.confidence} >= ${String(semanticConfidence(params))}
  )`;
}

function semanticBooleanFilter(dataset: ShoppingDataset, key: string, value: boolean, params: Amazon2023ProductFilters) {
  return sql`exists (
    select 1
    from ${shoppingProductSemanticAttributes}
    where ${shoppingProductSemanticAttributes.productId} = ${shoppingProducts.id}
    and ${shoppingProductSemanticAttributes.datasetId} = ${dataset.id}
    and ${shoppingProductSemanticAttributes.key} = ${key}
    and ${shoppingProductSemanticAttributes.valueBoolean} = ${value}
    and ${shoppingProductSemanticAttributes.confidence} >= ${String(semanticConfidence(params))}
  )`;
}

function textAttributeOrDetailsFilter(keyPattern: string, valuePatterns: string[]) {
  return or(
    ...valuePatterns.map((pattern) => sql`${shoppingProducts.title} ilike ${pattern}`),
    ...valuePatterns.map((pattern) => sql`${shoppingProducts.details}::text ilike ${pattern}`),
    ...valuePatterns.map((pattern) => sql`${shoppingProducts.features}::text ilike ${pattern}`),
    ...valuePatterns.map((pattern) => sql`exists (
      select 1
      from ${shoppingProductAttributes}
      where ${shoppingProductAttributes.productId} = ${shoppingProducts.id}
      and (
        ${shoppingProductAttributes.key} ilike ${keyPattern}
        or ${shoppingProductAttributes.label} ilike ${keyPattern}
        or ${shoppingProductAttributes.sourcePath} ilike ${keyPattern}
      )
      and ${shoppingProductAttributes.valueText} ilike ${pattern}
    )`),
  )!;
}

function sleeveLengthFilter(value: string) {
  if (value === "short_sleeve") {
    return textAttributeOrDetailsFilter("%sleeve%", ["%short sleeve%", "%short-sleeve%", "%shortsleeve%", "%short sleeves%"]);
  }
  if (value === "long_sleeve") {
    return textAttributeOrDetailsFilter("%sleeve%", ["%long sleeve%", "%long-sleeve%", "%longsleeve%", "%long sleeves%"]);
  }
  if (value === "sleeveless") {
    return textAttributeOrDetailsFilter("%sleeve%", ["%sleeveless%", "%tank%"]);
  }
  return textAttributeOrDetailsFilter("%sleeve%", [`%${value}%`]);
}

function buildProductFilters(dataset: ShoppingDataset, params: Amazon2023ProductFilters) {
  const filters: SQL[] = [eq(shoppingProducts.datasetId, dataset.id)];

  if (params.query) {
    filters.push(queryFilter(params.query));
  }

  if (params.category) {
    filters.push(categoryPathFilter(dataset, params.category));
  }

  if (params.subCategory) {
    filters.push(productTypeFilter(dataset, params.subCategory));
  }

  if (params.color) {
    filters.push(colorFilter(params.color));
  }

  if (params.brand) {
    const pattern = `%${params.brand}%`;
    filters.push(or(ilike(shoppingProducts.brand, pattern), ilike(shoppingProducts.store, pattern))!);
  }
  if (params.priceMin !== undefined) {
    filters.push(gte(shoppingProducts.priceAmount, String(params.priceMin)));
  }
  if (params.priceMax !== undefined) {
    filters.push(lte(shoppingProducts.priceAmount, String(params.priceMax)));
  }
  if (params.ratingMin !== undefined) {
    filters.push(gte(shoppingProducts.averageRating, String(params.ratingMin)));
  }
  if (params.ratingMax !== undefined) {
    filters.push(lte(shoppingProducts.averageRating, String(params.ratingMax)));
  }
  if (params.genderTarget) {
    filters.push(semanticTextFilter(dataset, "genderTarget", params.genderTarget, params));
  }
  if (params.occasion) {
    filters.push(semanticTextFilter(dataset, "occasion", params.occasion, params));
  }
  if (params.season) {
    filters.push(semanticTextFilter(dataset, "season", params.season, params));
  }
  if (params.material) {
    filters.push(semanticTextFilter(dataset, "material", params.material, params));
  }
  if (params.style) {
    filters.push(semanticTextFilter(dataset, "style", params.style, params));
  }
  if (params.sleeveLength) {
    filters.push(sleeveLengthFilter(params.sleeveLength));
  }
  if (params.warmthLevelMin !== undefined) {
    filters.push(semanticNumberMinFilter(dataset, "warmthLevel", params.warmthLevelMin, params));
  }
  if (params.comfortLevelMin !== undefined) {
    filters.push(semanticNumberMinFilter(dataset, "comfortLevel", params.comfortLevelMin, params));
  }
  if (params.durabilityLevelMin !== undefined) {
    filters.push(semanticNumberMinFilter(dataset, "durabilityLevel", params.durabilityLevelMin, params));
  }
  if (params.careEaseLevelMin !== undefined) {
    filters.push(semanticNumberMinFilter(dataset, "careEaseLevel", params.careEaseLevelMin, params));
  }
  if (params.waterproof !== undefined) {
    filters.push(semanticBooleanFilter(dataset, "waterproof", params.waterproof, params));
  }

  return filters;
}

function productOrder(sort: Amazon2023Sort) {
  if (sort === "price_asc") {
    return [asc(shoppingProducts.priceAmount), asc(shoppingProducts.title)];
  }
  if (sort === "price_desc") {
    return [desc(shoppingProducts.priceAmount), asc(shoppingProducts.title)];
  }
  if (sort === "rating_desc") {
    return [desc(shoppingProducts.averageRating), desc(shoppingProducts.ratingNumber), asc(shoppingProducts.title)];
  }
  if (sort === "review_count_desc") {
    return [desc(shoppingProducts.ratingNumber), desc(shoppingProducts.averageRating), asc(shoppingProducts.title)];
  }
  return [asc(shoppingProducts.title)];
}

async function getPrimaryImages(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, typeof shoppingProductImages.$inferSelect>();
  }

  const rows = await db
    .select()
    .from(shoppingProductImages)
    .where(inArray(shoppingProductImages.productId, productIds))
    .orderBy(
      asc(shoppingProductImages.productId),
      sql`case
        when ${shoppingProductImages.storagePublicUrl} is not null then 0
        when ${shoppingProductImages.status} in ('ok', 'mirrored') then 1
        when ${shoppingProductImages.status} in ('unchecked') then 2
        else 3
      end`,
      desc(shoppingProductImages.isPrimary),
      asc(shoppingProductImages.sortOrder),
    );

  const byProduct = new Map<string, typeof shoppingProductImages.$inferSelect>();
  for (const row of rows) {
    if (!byProduct.has(row.productId)) {
      byProduct.set(row.productId, row);
    }
  }
  return byProduct;
}

async function getSemanticAttributes(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, Array<typeof shoppingProductSemanticAttributes.$inferSelect>>();
  }
  const rows = await db
    .select()
    .from(shoppingProductSemanticAttributes)
    .where(inArray(shoppingProductSemanticAttributes.productId, productIds))
    .orderBy(asc(shoppingProductSemanticAttributes.productId), asc(shoppingProductSemanticAttributes.key), desc(shoppingProductSemanticAttributes.confidence));

  const byProduct = new Map<string, Array<typeof shoppingProductSemanticAttributes.$inferSelect>>();
  for (const row of rows) {
    const values = byProduct.get(row.productId) ?? [];
    values.push(row);
    byProduct.set(row.productId, values);
  }
  return byProduct;
}

function serializeSemanticAttribute(row: typeof shoppingProductSemanticAttributes.$inferSelect) {
  const value = row.valueText ?? nullableNumber(row.valueNumber) ?? row.valueBoolean ?? null;
  return {
    key: row.key,
    label: row.key,
    value,
    valueText: row.valueText,
    valueNumber: nullableNumber(row.valueNumber),
    valueBoolean: row.valueBoolean,
    displayValue: value === null ? "Any" : String(value),
    score: nullableNumber(row.score),
    confidence: nullableNumber(row.confidence),
    evidenceCount: row.evidenceCount,
    positiveCount: row.positiveCount,
    negativeCount: row.negativeCount,
    neutralCount: row.neutralCount,
    source: row.source,
    sourceVersion: row.sourceVersion,
  };
}

function serializeProductSummary(
  product: ShoppingProduct,
  image?: typeof shoppingProductImages.$inferSelect,
  view: Amazon2023ProductView = "card",
  semanticRows: Array<typeof shoppingProductSemanticAttributes.$inferSelect> = [],
) {
  const details = jsonRecord(product.details);
  const features = jsonArray<string>(product.features);
  const categoryPath = jsonArray<string>(product.categoryPath);
  const normalizedParentCategory = inferParentCategory(categoryPath, product.title, product.mainCategory);
  const productType = inferProductType(categoryPath, product.title, product.mainCategory);
  const colors = detailValues(details, ["Color", "Color Name", "Colour"]).map(normalizeColorGroup);
  const sizes = detailValues(details, ["Size", "Size Name", "Department"]);
  const semanticAttributes = semanticRows.map(serializeSemanticAttribute);
  return {
    id: product.id,
    sourceProductId: product.sourceProductId,
    parentAsin: product.parentAsin,
    asin: product.asin,
    slug: product.slug,
    title: product.title,
    name: product.title,
    brand: product.brand ?? product.store,
    store: product.store,
    price: nullableNumber(product.priceAmount),
    priceAmount: nullableNumber(product.priceAmount),
    currencyCode: product.currencyCode,
    rating: nullableNumber(product.averageRating),
    reviewCount: product.ratingNumber,
    category: displayCategoryFromPath(categoryPath),
    subCategory: displaySubCategoryFromPath(categoryPath),
    normalizedParentCategory,
    productType,
    mainCategory: product.mainCategory,
    categoryPath,
    imageUrl: image?.storagePublicUrl ?? image?.sourceUrl ?? null,
    image: image
      ? {
          sourceUrl: image.sourceUrl,
          variant: image.variant,
          status: image.status,
          storagePath: image.storagePath,
          publicUrl: image.storagePublicUrl,
        }
      : null,
    imageFallbackStatus: product.imageFallbackStatus,
    colors,
    sizes,
    semanticAttributes,
    features: view === "detail" ? features : features.slice(0, 4),
    details: view === "detail" ? details : undefined,
  };
}

export async function getAmazon2023Manifest(datasetSlug?: string) {
  const dataset = await getActiveAmazon2023Dataset(datasetSlug);
  if (!dataset) {
    return null;
  }

  const [productsRow] = await db
    .select({ value: count() })
    .from(shoppingProducts)
    .where(eq(shoppingProducts.datasetId, dataset.id));
  const [reviewsRow] = await db
    .select({ value: count() })
    .from(shoppingReviews)
    .where(eq(shoppingReviews.datasetId, dataset.id));
  const [imagesRow] = await db
    .select({ value: count() })
    .from(shoppingProductImages)
    .innerJoin(shoppingProducts, eq(shoppingProducts.id, shoppingProductImages.productId))
    .where(eq(shoppingProducts.datasetId, dataset.id));

  return {
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      sourceName: dataset.sourceName,
      sourceCategory: dataset.sourceCategory,
      subsetStrategy: dataset.subsetStrategy,
      dbBudgetBytes: dataset.dbBudgetBytes,
      storageStrategy: dataset.storageStrategy,
      rawManifest: dataset.rawManifest,
      isActive: dataset.isActive,
    },
    counts: {
      products: productsRow?.value ?? 0,
      reviews: reviewsRow?.value ?? 0,
      images: imagesRow?.value ?? 0,
    },
  };
}

export async function getAmazon2023Categories(datasetSlug?: string) {
  const dataset = await getActiveAmazon2023Dataset(datasetSlug);
  if (!dataset) {
    return null;
  }

  const rows = await db
    .select()
    .from(shoppingCategories)
    .where(and(eq(shoppingCategories.datasetId, dataset.id), eq(shoppingCategories.includeInSeed, true)))
    .orderBy(asc(shoppingCategories.depth), asc(shoppingCategories.name));

  const representativeRows = rows.length
    ? await db
        .select({
          categoryId: shoppingProductCategoryPaths.categoryId,
          productId: shoppingProducts.id,
          productTitle: shoppingProducts.title,
          sourceUrl: shoppingProductImages.sourceUrl,
          storagePublicUrl: shoppingProductImages.storagePublicUrl,
        })
        .from(shoppingProductCategoryPaths)
        .innerJoin(shoppingProducts, eq(shoppingProducts.id, shoppingProductCategoryPaths.productId))
        .leftJoin(
          shoppingProductImages,
          and(eq(shoppingProductImages.productId, shoppingProducts.id), eq(shoppingProductImages.isPrimary, true)),
        )
        .where(and(eq(shoppingProducts.datasetId, dataset.id), inArray(shoppingProductCategoryPaths.categoryId, rows.map((row) => row.id))))
        .orderBy(
          asc(shoppingProductCategoryPaths.categoryId),
          desc(shoppingProducts.ratingNumber),
          desc(shoppingProducts.averageRating),
          asc(shoppingProducts.title),
        )
    : [];
  const representativeByCategory = new Map<string, (typeof representativeRows)[number]>();
  for (const row of representativeRows) {
    if (!representativeByCategory.has(row.categoryId)) {
      representativeByCategory.set(row.categoryId, row);
    }
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const navigation = rows.map((row) => {
    const parent = row.parentId ? rowById.get(row.parentId) : undefined;
    const representative = representativeByCategory.get(row.id);
    return {
      id: row.id,
      key: row.slug,
      parentId: row.parentId,
      parentKey: parent?.slug ?? null,
      slug: row.slug,
      filterSlug: row.slug,
      sourcePath: row.sourcePath,
      name: row.name,
      displayName: row.name,
      depth: row.depth,
      productCount: row.productCount,
      representativeProductId: representative?.productId ?? null,
      representativeImageUrl: representative?.storagePublicUrl ?? representative?.sourceUrl ?? null,
      representativeAlt: representative?.productTitle ?? row.name,
    };
  });

  return {
    dataset: dataset.slug,
    categories: navigation.filter((row) => row.depth === 1 && row.productCount > 0),
    navigation,
    taxonomy: navigation,
  };
}

export async function searchAmazon2023Products(params: Amazon2023ProductSearchParams) {
  const dataset = await getActiveAmazon2023Dataset(params.datasetSlug);
  if (!dataset) {
    return null;
  }

  const filters = buildProductFilters(dataset, params);
  const [totalRow] = await db.select({ value: count() }).from(shoppingProducts).where(and(...filters));
  const rows = await db
    .select()
    .from(shoppingProducts)
    .where(and(...filters))
    .orderBy(...productOrder(params.sort))
    .limit(params.limit)
    .offset(params.offset);
  const imageMap = await getPrimaryImages(rows.map((row) => row.id));
  const semanticMap = await getSemanticAttributes(rows.map((row) => row.id));
  const view = params.view ?? "card";

  return {
    dataset: dataset.slug,
    items: rows.map((row) => serializeProductSummary(row, imageMap.get(row.id), view, semanticMap.get(row.id))),
    sort: params.sort,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: totalRow?.value ?? 0,
    },
  };
}

export async function getAmazon2023Facets(params: Amazon2023ProductFilters) {
  const dataset = await getActiveAmazon2023Dataset(params.datasetSlug);
  if (!dataset) {
    return null;
  }

  const filters = buildProductFilters(dataset, params);
  const [rangeRow] = await db
    .select({
      total: count(),
      minPrice: sql<string | null>`min(${shoppingProducts.priceAmount})`,
      maxPrice: sql<string | null>`max(${shoppingProducts.priceAmount})`,
      minRating: sql<string | null>`min(${shoppingProducts.averageRating})`,
      maxRating: sql<string | null>`max(${shoppingProducts.averageRating})`,
      maxReviews: sql<number | null>`max(${shoppingProducts.ratingNumber})`,
    })
    .from(shoppingProducts)
    .where(and(...filters));

  const brandRows = await db
    .select({
      brand: sql<string>`coalesce(${shoppingProducts.brand}, ${shoppingProducts.store}, 'Unknown')`,
      count: count(),
    })
    .from(shoppingProducts)
    .where(and(...filters))
    .groupBy(sql`coalesce(${shoppingProducts.brand}, ${shoppingProducts.store}, 'Unknown')`)
    .orderBy(desc(count()))
    .limit(30);

  const subCategoryRows = await db
    .select({
      slug: shoppingCategories.slug,
      sourcePath: shoppingCategories.sourcePath,
      name: shoppingCategories.name,
      depth: shoppingCategories.depth,
      count: count(),
    })
    .from(shoppingProducts)
    .innerJoin(shoppingProductCategoryPaths, eq(shoppingProductCategoryPaths.productId, shoppingProducts.id))
    .innerJoin(shoppingCategories, eq(shoppingCategories.id, shoppingProductCategoryPaths.categoryId))
    .where(and(...filters, eq(shoppingCategories.datasetId, dataset.id), gte(shoppingCategories.depth, 2)))
    .groupBy(shoppingCategories.slug, shoppingCategories.sourcePath, shoppingCategories.name, shoppingCategories.depth)
    .orderBy(desc(count()), asc(shoppingCategories.name))
    .limit(50);

  const rawColorRows = await db
    .select({
      value: shoppingProductAttributes.valueText,
      count: count(),
    })
    .from(shoppingProducts)
    .innerJoin(shoppingProductAttributes, eq(shoppingProductAttributes.productId, shoppingProducts.id))
    .where(
      and(
        ...filters,
        or(
          ilike(shoppingProductAttributes.key, "%color%"),
          ilike(shoppingProductAttributes.label, "%color%"),
          ilike(shoppingProductAttributes.sourcePath, "%color%"),
        )!,
        sql`${shoppingProductAttributes.valueText} is not null`,
      ),
    )
    .groupBy(shoppingProductAttributes.valueText)
    .orderBy(desc(count()))
    .limit(150);

  const colors = new Map<string, number>();
  for (const row of rawColorRows) {
    const label = normalizeColorGroup(row.value ?? "");
    if (!label) {
      continue;
    }
    colors.set(label, (colors.get(label) ?? 0) + row.count);
  }

  const semanticTextKeys = ["genderTarget", "occasion", "season", "material", "style", "sleeveLength"];
  const semanticTextRows = await db
    .select({
      key: shoppingProductSemanticAttributes.key,
      value: shoppingProductSemanticAttributes.valueText,
      count: sql<number>`count(distinct ${shoppingProducts.id})`,
    })
    .from(shoppingProducts)
    .innerJoin(shoppingProductSemanticAttributes, eq(shoppingProductSemanticAttributes.productId, shoppingProducts.id))
    .where(
      and(
        ...filters,
        eq(shoppingProductSemanticAttributes.datasetId, dataset.id),
        inArray(shoppingProductSemanticAttributes.key, semanticTextKeys),
        sql`${shoppingProductSemanticAttributes.valueText} is not null`,
        gte(shoppingProductSemanticAttributes.confidence, String(semanticConfidence(params))),
      ),
    )
    .groupBy(shoppingProductSemanticAttributes.key, shoppingProductSemanticAttributes.valueText)
    .orderBy(shoppingProductSemanticAttributes.key, desc(sql`count(distinct ${shoppingProducts.id})`))
    .limit(120);

  const semanticNumberKeys = ["warmthLevel", "comfortLevel", "durabilityLevel", "careEaseLevel"];
  const semanticNumberRows = await db
    .select({
      key: shoppingProductSemanticAttributes.key,
      value: shoppingProductSemanticAttributes.valueNumber,
      count: sql<number>`count(distinct ${shoppingProducts.id})`,
    })
    .from(shoppingProducts)
    .innerJoin(shoppingProductSemanticAttributes, eq(shoppingProductSemanticAttributes.productId, shoppingProducts.id))
    .where(
      and(
        ...filters,
        eq(shoppingProductSemanticAttributes.datasetId, dataset.id),
        inArray(shoppingProductSemanticAttributes.key, semanticNumberKeys),
        sql`${shoppingProductSemanticAttributes.valueNumber} is not null`,
        gte(shoppingProductSemanticAttributes.confidence, String(semanticConfidence(params))),
      ),
    )
    .groupBy(shoppingProductSemanticAttributes.key, shoppingProductSemanticAttributes.valueNumber)
    .orderBy(shoppingProductSemanticAttributes.key, desc(shoppingProductSemanticAttributes.valueNumber))
    .limit(60);

  const semanticBooleanRows = await db
    .select({
      key: shoppingProductSemanticAttributes.key,
      value: shoppingProductSemanticAttributes.valueBoolean,
      count: sql<number>`count(distinct ${shoppingProducts.id})`,
    })
    .from(shoppingProducts)
    .innerJoin(shoppingProductSemanticAttributes, eq(shoppingProductSemanticAttributes.productId, shoppingProducts.id))
    .where(
      and(
        ...filters,
        eq(shoppingProductSemanticAttributes.datasetId, dataset.id),
        eq(shoppingProductSemanticAttributes.key, "waterproof"),
        sql`${shoppingProductSemanticAttributes.valueBoolean} is not null`,
        gte(shoppingProductSemanticAttributes.confidence, String(semanticConfidence(params))),
      ),
    )
    .groupBy(shoppingProductSemanticAttributes.key, shoppingProductSemanticAttributes.valueBoolean)
    .orderBy(desc(sql`count(distinct ${shoppingProducts.id})`));

  const semantic = Object.fromEntries(semanticTextKeys.map((key) => [key, [] as Array<{ value: string; label: string; count: number }>]));
  for (const row of semanticTextRows) {
    const value = String(row.value ?? "").trim();
    if (!value) continue;
    semantic[row.key]?.push({ value, label: value, count: row.count });
  }

  const levels = Object.fromEntries(semanticNumberKeys.map((key) => [key, [] as Array<{ value: number; label: string; count: number }>]));
  for (const row of semanticNumberRows) {
    const value = nullableNumber(row.value);
    if (value === null) continue;
    levels[row.key]?.push({ value, label: `${value}+`, count: row.count });
  }

  const booleans = {
    waterproof: semanticBooleanRows
      .filter((row) => typeof row.value === "boolean")
      .map((row) => ({ value: Boolean(row.value), label: row.value ? "Yes" : "No", count: row.count })),
  };

  return {
    dataset: dataset.slug,
    total: rangeRow?.total ?? 0,
    ranges: {
      price: {
        min: nullableNumber(rangeRow?.minPrice),
        max: nullableNumber(rangeRow?.maxPrice),
        currencyCode: "USD",
      },
      rating: {
        min: nullableNumber(rangeRow?.minRating),
        max: nullableNumber(rangeRow?.maxRating),
      },
      reviewCount: {
        max: nullableNumber(rangeRow?.maxReviews),
      },
    },
    brands: brandRows.map((row) => ({ value: row.brand, label: row.brand, count: row.count })),
    subCategories: subCategoryRows.map((row) => ({
      value: row.slug,
      label: row.name,
      slug: row.slug,
      sourcePath: row.sourcePath,
      depth: row.depth,
      count: row.count,
    })),
    colors: [...colors.entries()]
      .map(([label, value]) => ({ value: label, label, count: value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    semantic,
    levels,
    booleans,
  };
}

function serializeEvidence(item: typeof shoppingReviewEvidence.$inferSelect) {
  return {
    id: item.id,
    reviewId: item.reviewId,
    productId: item.productId,
    attributeKey: item.attributeKey,
    attributeLabel: item.attributeLabel,
    sentiment: item.sentiment,
    evidenceText: item.evidenceText,
    text: item.evidenceText,
    issueType: item.issueType,
    confidence: nullableNumber(item.confidence),
    source: item.source,
  };
}

function pushGrouped<T extends { productId: string }>(map: Map<string, T[]>, row: T) {
  const rows = map.get(row.productId) ?? [];
  rows.push(row);
  map.set(row.productId, rows);
}

async function hydrateAmazon2023Products(products: ShoppingProduct[]) {
  if (!products.length) {
    return [];
  }

  const productIds = products.map((product) => product.id);
  const [images, attributes, reviews, evidence, categories] = await Promise.all([
    db
      .select()
      .from(shoppingProductImages)
      .where(inArray(shoppingProductImages.productId, productIds))
      .orderBy(
        asc(shoppingProductImages.productId),
        sql`case
          when ${shoppingProductImages.storagePublicUrl} is not null then 0
          when ${shoppingProductImages.status} in ('ok', 'mirrored') then 1
          when ${shoppingProductImages.status} in ('unchecked') then 2
          else 3
        end`,
        desc(shoppingProductImages.isPrimary),
        asc(shoppingProductImages.sortOrder),
      ),
    db
      .select()
      .from(shoppingProductAttributes)
      .where(inArray(shoppingProductAttributes.productId, productIds))
      .orderBy(asc(shoppingProductAttributes.productId), asc(shoppingProductAttributes.key)),
    db
      .select()
      .from(shoppingReviews)
      .where(inArray(shoppingReviews.productId, productIds))
      .orderBy(asc(shoppingReviews.productId), desc(shoppingReviews.reviewTimestamp), desc(shoppingReviews.helpfulVote)),
    db
      .select()
      .from(shoppingReviewEvidence)
      .where(inArray(shoppingReviewEvidence.productId, productIds))
      .orderBy(asc(shoppingReviewEvidence.productId), desc(shoppingReviewEvidence.confidence), asc(shoppingReviewEvidence.attributeKey)),
    db
      .select({
        productId: shoppingProductCategoryPaths.productId,
        category: shoppingCategories,
        sortOrder: shoppingProductCategoryPaths.sortOrder,
      })
      .from(shoppingProductCategoryPaths)
      .innerJoin(shoppingCategories, eq(shoppingCategories.id, shoppingProductCategoryPaths.categoryId))
      .where(inArray(shoppingProductCategoryPaths.productId, productIds))
      .orderBy(asc(shoppingProductCategoryPaths.productId), asc(shoppingProductCategoryPaths.sortOrder)),
  ]);

  const imagesByProduct = new Map<string, typeof images>();
  const attributesByProduct = new Map<string, typeof attributes>();
  const reviewsByProduct = new Map<string, typeof reviews>();
  const evidenceByProduct = new Map<string, typeof evidence>();
  const categoriesByProduct = new Map<string, typeof categories>();

  for (const image of images) pushGrouped(imagesByProduct, image);
  for (const attribute of attributes) pushGrouped(attributesByProduct, attribute);
  for (const review of reviews) pushGrouped(reviewsByProduct, review);
  for (const item of evidence) pushGrouped(evidenceByProduct, item);
  for (const category of categories) pushGrouped(categoriesByProduct, category);
  const semanticsByProduct = await getSemanticAttributes(productIds);

  return products.map((product) => {
    const productImages = imagesByProduct.get(product.id) ?? [];
    const productAttributes = attributesByProduct.get(product.id) ?? [];
    const productReviews = (reviewsByProduct.get(product.id) ?? []).slice(0, 25);
    const productEvidence = (evidenceByProduct.get(product.id) ?? []).slice(0, 100);
    const productCategories = categoriesByProduct.get(product.id) ?? [];
    const evidenceByReview = new Map<string, typeof productEvidence>();

    for (const item of productEvidence) {
      const rows = evidenceByReview.get(item.reviewId) ?? [];
      rows.push(item);
      evidenceByReview.set(item.reviewId, rows);
    }

    return {
      ...serializeProductSummary(product, productImages[0], "detail"),
      description: jsonArray<string>(product.description),
      descriptionText: product.descriptionText,
      rawMetadata: product.rawMetadata,
      images: productImages.map((image) => ({
        id: image.id,
        sourceUrl: image.sourceUrl,
        variant: image.variant,
        isPrimary: image.isPrimary,
        status: image.status,
        httpStatus: image.httpStatus,
        checkedAt: image.checkedAt,
        storagePath: image.storagePath,
        publicUrl: image.storagePublicUrl,
        rawImage: image.rawImage,
      })),
      attributes: productAttributes.map((attribute) => ({
        key: attribute.key,
        label: attribute.label,
        valueText: attribute.valueText,
        valueNumber: nullableNumber(attribute.valueNumber),
        valueBoolean: attribute.valueBoolean,
        valueJson: attribute.valueJson,
        sourcePath: attribute.sourcePath,
        isFacetCandidate: attribute.isFacetCandidate,
      })),
      semanticAttributes: (semanticsByProduct.get(product.id) ?? []).map(serializeSemanticAttribute),
      categories: productCategories.map((row) => ({
        id: row.category.id,
        slug: row.category.slug,
        sourcePath: row.category.sourcePath,
        name: row.category.name,
        depth: row.category.depth,
      })),
      reviews: productReviews.map((review) => ({
        id: review.id,
        sourceReviewId: review.sourceReviewId,
        rating: review.rating,
        title: review.title,
        body: review.body,
        helpfulVote: review.helpfulVote,
        verifiedPurchase: review.verifiedPurchase,
        reviewTimestamp: review.reviewTimestamp,
        rawReview: review.rawReview,
        evidence: (evidenceByReview.get(review.id) ?? []).map(serializeEvidence),
      })),
      reviewEvidence: productEvidence.map(serializeEvidence),
    };
  });
}

export async function getAmazon2023ProductDetails(productIds: string[], datasetSlug?: string) {
  const dataset = await getActiveAmazon2023Dataset(datasetSlug);
  if (!dataset) {
    return null;
  }

  const ids = [...new Set(productIds)].filter(Boolean);
  if (!ids.length) {
    return { dataset: dataset.slug, products: [] };
  }

  const rows = await db
    .select()
    .from(shoppingProducts)
    .where(and(eq(shoppingProducts.datasetId, dataset.id), inArray(shoppingProducts.id, ids)));
  const order = new Map(ids.map((id, index) => [id, index]));
  const products = await hydrateAmazon2023Products(rows);

  return {
    dataset: dataset.slug,
    products: products.sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)),
  };
}

export async function getAmazon2023ProductDetail(productIdOrSlug: string, datasetSlug?: string) {
  const dataset = await getActiveAmazon2023Dataset(datasetSlug);
  if (!dataset) {
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productIdOrSlug);
  const [product] = await db
    .select()
    .from(shoppingProducts)
    .where(
      and(
        eq(shoppingProducts.datasetId, dataset.id),
        isUuid
          ? eq(shoppingProducts.id, productIdOrSlug)
          : or(eq(shoppingProducts.slug, productIdOrSlug), eq(shoppingProducts.sourceProductId, productIdOrSlug))!,
      ),
    )
    .limit(1);

  if (!product) {
    return { dataset: dataset.slug, product: null };
  }

  const [hydrated] = await hydrateAmazon2023Products([product]);
  return {
    dataset: dataset.slug,
    product: hydrated ?? null,
  };
}
