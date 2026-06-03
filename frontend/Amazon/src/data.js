const runtimeApiBaseUrl = typeof globalThis !== "undefined" && typeof globalThis.__AMAZON_API_BASE_URL__ === "string"
  ? globalThis.__AMAZON_API_BASE_URL__
  : undefined;

export const AMAZON_API_BASE_URL = (runtimeApiBaseUrl ?? import.meta.env.VITE_AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const AMAZON_CATALOG_API_PREFIX = "/api/demos/amazon2023";
const AMAZON_AI_API_PREFIX = "/api/ai/amazon2023";
const catalogLoadCache = new Map();

const HOME_CATALOG_CATEGORY_SLUGS = [
  "amazon-fashion-women-clothing",
  "amazon-fashion-men-clothing",
  "amazon-fashion-girls-clothing",
  "amazon-fashion-boys-clothing",
  "amazon-fashion-women-shoes",
  "amazon-fashion-men-shoes",
  "amazon-fashion-women-bags",
  "amazon-fashion-men-bags",
];

export const COLOR_GROUPS = {
  black: { label: "Black", css: "#111827" },
  white: { label: "White", css: "#ffffff" },
  gray: { label: "Gray", css: "#808080" },
  brown: { label: "Brown", css: "#8B4513" },
  tan: { label: "Tan", css: "#C19A6B" },
  green: { label: "Green", css: "#4A7C59" },
  blue: { label: "Blue", css: "#2F5BA8" },
  red: { label: "Red", css: "#D62828" },
  yellow: { label: "Yellow", css: "#E7B928" },
  pink: { label: "Pink", css: "#E49DB0" },
  purple: { label: "Purple", css: "#7D4E9C" },
  orange: { label: "Orange", css: "#E07A41" },
};

const COLOR_NAME_TO_GROUP = {
  amber: "orange",
  ash: "gray",
  aqua: "blue",
  beige: "tan",
  berry: "red",
  biscuit: "tan",
  blush: "pink",
  camel: "tan",
  caramel: "tan",
  charcoal: "gray",
  cherry: "red",
  chocolate: "brown",
  cobalt: "blue",
  coffee: "brown",
  copper: "orange",
  coral: "orange",
  denim: "blue",
  emerald: "green",
  espresso: "brown",
  fuchsia: "pink",
  gold: "yellow",
  graphite: "gray",
  ivory: "white",
  jade: "green",
  khaki: "tan",
  lavender: "purple",
  lemon: "yellow",
  lilac: "purple",
  lime: "green",
  magenta: "pink",
  maroon: "red",
  mint: "green",
  mocha: "brown",
  moss: "green",
  mustard: "yellow",
  navy: "blue",
  olive: "green",
  peach: "orange",
  pewter: "gray",
  pine: "green",
  plum: "purple",
  pumpkin: "orange",
  rose: "pink",
  royal: "blue",
  ruby: "red",
  sage: "green",
  sand: "tan",
  silver: "gray",
  slate: "gray",
  stone: "gray",
  taupe: "tan",
  teal: "blue",
  violet: "purple",
  wine: "red",
};

const SEARCH_IGNORED_TERMS = new Set([
  "a",
  "an",
  "and",
  "are",
  "beautiful",
  "best",
  "for",
  "good",
  "great",
  "in",
  "me",
  "nice",
  "not",
  "of",
  "on",
  "or",
  "pretty",
  "the",
  "too",
  "to",
  "under",
  "with",
  "거",
  "것",
  "괜찮은",
  "나",
  "내",
  "좀",
  "좋은",
  "추천",
  "찾아줘",
  "보여줘",
  "저렴한",
  "저렴",
  "비싸지",
  "가성비",
]);

const SEARCH_TERM_ALIASES = {
  "가벼운": ["lightweight", "weight"],
  "가볍": ["lightweight", "weight"],
  "가방": ["bag", "bags", "tote", "shopper", "backpack"],
  "가죽": ["leather"],
  "겨울": ["winter"],
  "경량": ["lightweight", "weight"],
  "구두": ["loafers", "footwear"],
  "남성": ["male"],
  "남성용": ["male"],
  "남자": ["male"],
  "네이비": ["navy"],
  "니트": ["knit", "sweater", "sweaters"],
  "데님": ["denim", "jeans"],
  "데일리": ["daily", "casual"],
  "드레스": ["dress", "dresses"],
  "더플": ["duffel", "duffel bag"],
  "더플백": ["duffel", "duffel bag"],
  "따뜻": ["warmth", "warm"],
  "따뜻한": ["warmth", "warm"],
  "로퍼": ["loafers", "footwear"],
  "리넨": ["linen"],
  "린넨": ["linen"],
  "면": ["cotton"],
  "모자": ["hat", "hats"],
  "바람막이": ["windbreaker", "windbreakers"],
  "바지": ["pants", "trousers", "slacks"],
  "반바지": ["shorts"],
  "방수": ["waterproof", "weather"],
  "백팩": ["backpack", "daypack", "pack"],
  "베이지": ["beige"],
  "벨트": ["belt"],
  "부드러운": ["softness", "soft"],
  "부드럽": ["softness", "soft"],
  "부츠": ["boots", "footwear"],
  "블랙": ["black"],
  "블라우스": ["blouse", "blouses"],
  "비": ["waterproof", "rain", "weather"],
  "사계절": ["all season"],
  "샌들": ["sandals", "footwear"],
  "선글라스": ["sunglasses"],
  "셔츠": ["shirt", "shirts"],
  "슬링백": ["sling bag"],
  "수납": ["storage", "capacity", "pockets"],
  "숄더백": ["shoulder bag"],
  "스니커즈": ["sneakers", "footwear"],
  "스웨터": ["sweater", "sweaters"],
  "스웨트셔츠": ["sweatshirt", "sweatshirts"],
  "스웻셔츠": ["sweatshirt", "sweatshirts"],
  "스카프": ["scarf", "scarves"],
  "스커트": ["skirt", "skirts"],
  "슬랙스": ["slacks", "pants", "trousers"],
  "신발": ["shoe", "shoes", "footwear", "sneaker", "loafer", "boot"],
  "아우터": ["outerwear", "coat", "jacket"],
  "아이보리": ["ivory"],
  "여름": ["summer", "breathability"],
  "여성": ["female"],
  "여성용": ["female"],
  "여자": ["female"],
  "오피스": ["office"],
  "올리브": ["olive"],
  "운동": ["workout", "sporty", "active"],
  "운동화": ["shoe", "shoes", "footwear", "sneaker"],
  "울": ["wool", "wool blend"],
  "원피스": ["dress", "dresses"],
  "자켓": ["jacket", "jackets", "outerwear"],
  "장갑": ["gloves"],
  "재킷": ["jacket", "jackets", "outerwear"],
  "조끼": ["vest", "vests"],
  "주머니": ["pocket", "pockets", "storage"],
  "지갑": ["wallet"],
  "청바지": ["jeans", "denim"],
  "출근": ["commute", "office"],
  "출근용": ["commute", "office"],
  "출퇴근": ["commute", "office"],
  "출퇴근용": ["commute", "office"],
  "통근": ["commute"],
  "코트": ["coat", "coats", "outerwear"],
  "크로스백": ["crossbody bag"],
  "토트백": ["tote", "shopper"],
  "통기": ["breathable", "breathability"],
  "티": ["tee", "tees"],
  "티셔츠": ["tee", "tees"],
  "튼튼": ["durable", "durability"],
  "패딩": ["puffer", "padding", "paddings"],
  "편한": ["comfortable", "comfort"],
  "편안": ["comfortable", "comfort"],
  "플랫": ["flats", "footwear"],
  "플랫슈즈": ["flats", "footwear"],
  "하객룩": ["occasion dress", "dress"],
  "후드": ["hoodie", "hoodies"],
  "후드티": ["hoodie", "hoodies"],
  bag: ["bag", "bags", "tote", "shopper", "backpack"],
  bags: ["bag", "bags", "tote", "shopper", "backpack"],
  backpack: ["backpack", "daypack", "pack"],
  backpacks: ["backpack", "daypack", "pack"],
  breathable: ["breathable", "breathability"],
  capacity: ["capacity", "liters", "storage"],
  comfortable: ["comfortable", "comfort"],
  comfy: ["comfortable", "comfort"],
  coat: ["coat", "coats", "outerwear"],
  coats: ["coat", "coats", "outerwear"],
  dress: ["dress", "dresses"],
  dresses: ["dress", "dresses"],
  durable: ["durable", "durability"],
  daypack: ["daypack", "backpack", "backpacks"],
  duffel: ["duffel", "duffel bag"],
  flats: ["flats", "footwear"],
  easycare: ["easy care", "care", "wash"],
  grippy: ["grippy", "grip", "sole grip"],
  jacket: ["jacket", "jackets", "outerwear", "padding", "paddings"],
  jackets: ["jacket", "jackets", "outerwear", "padding", "paddings"],
  lightweight: ["lightweight", "light weight", "weight"],
  opaque: ["opaque", "opacity"],
  pocket: ["pocket", "pockets", "storage"],
  pockets: ["pocket", "pockets", "storage"],
  puffer: ["puffer", "padding", "paddings"],
  running: ["running", "walking", "athletic", "active", "sneaker"],
  scarf: ["scarf", "scarves"],
  scarves: ["scarf", "scarves"],
  shoe: ["shoe", "shoes", "footwear", "sneaker", "loafer", "boot"],
  shoes: ["shoe", "shoes", "footwear", "sneaker", "loafer", "boot"],
  sneaker: ["shoe", "shoes", "footwear", "sneaker"],
  sneakers: ["shoe", "shoes", "footwear", "sneaker"],
  sling: ["sling bag"],
  slingbag: ["sling bag"],
  support: ["support", "arch support"],
  toe: ["toe", "toe box", "toebox"],
  washable: ["washable", "machine washable", "wash"],
  waterproof: ["waterproof", "water resistant", "weather"],
  wool: ["wool", "wool blend"],
};

async function apiJson(path, options) {
  const headers = { ...(options?.headers ?? {}) };
  if (options?.body && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }
  const response = await fetch(`${AMAZON_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // Keep HTTP status as fallback.
    }
    throw new Error(message);
  }
  return response.json();
}

function appendLocale(params, locale) {
  if (locale === "ko") {
    params.set("locale", "ko");
  }
  return params;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeSearchTerms(query) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !/^\d+(\.\d+)?$/.test(term) && !SEARCH_IGNORED_TERMS.has(term));
}

export function productMatchesQuery(product, query) {
  const terms = normalizeSearchTerms(query);
  if (!terms.length) {
    return true;
  }

  const attributeText = product.attributes?.map((attribute) => `${attribute.label} ${attribute.value} ${attribute.displayValue}`).join(" ") ?? "";
  const haystack = normalizeSearchText(
    [
      product.name,
      product.category,
      product.categorySlug,
      product.subCategory,
      product.subCategorySlug,
      product.keyword,
      product.desc,
      product.description,
      product.brandStory,
      product.features?.join(" "),
      product.colors?.join(" "),
      attributeText,
    ].join(" "),
  );

  return terms.every((term) => (SEARCH_TERM_ALIASES[term] ?? [term]).some((alias) => haystack.includes(alias)));
}

function normalizeColorLabel(value) {
  return String(value ?? "").toLowerCase().trim();
}

export function getColorGroupKey(colorName) {
  const key = normalizeColorLabel(colorName);
  if (!key) return "";
  if (COLOR_GROUPS[key]) return key;
  if (COLOR_NAME_TO_GROUP[key]) return COLOR_NAME_TO_GROUP[key];
  if (key.includes("black")) return "black";
  if (key.includes("white") || key.includes("cream") || key.includes("ivory")) return "white";
  if (key.includes("gray") || key.includes("grey") || key.includes("ash") || key.includes("charcoal")) return "gray";
  if (key.includes("tan") || key.includes("beige") || key.includes("camel") || key.includes("khaki")) return "tan";
  if (key.includes("brown") || key.includes("chocolate") || key.includes("mocha")) return "brown";
  if (key.includes("green") || key.includes("olive") || key.includes("sage")) return "green";
  if (key.includes("blue") || key.includes("navy") || key.includes("teal") || key.includes("denim")) return "blue";
  if (key.includes("red") || key.includes("wine") || key.includes("maroon")) return "red";
  if (key.includes("yellow") || key.includes("gold") || key.includes("mustard")) return "yellow";
  if (key.includes("pink") || key.includes("rose") || key.includes("blush")) return "pink";
  if (key.includes("purple") || key.includes("violet") || key.includes("plum")) return "purple";
  if (key.includes("orange") || key.includes("coral") || key.includes("amber")) return "orange";
  return "gray";
}

export function getColorGroupLabel(colorName) {
  const groupKey = getColorGroupKey(colorName);
  return COLOR_GROUPS[groupKey]?.label ?? String(colorName);
}

export function mapColorToCss(colorName) {
  const groupKey = getColorGroupKey(colorName);
  return COLOR_GROUPS[groupKey]?.css ?? "#cccccc";
}

export function parsePrice(value) {
  if (typeof value === "object" && value !== null && "amount" in value) {
    return Number(value.amount) || 0;
  }
  const parsed = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseReviewCount(value) {
  const parsed = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsePrice(value));
}

export function formatKrw(value) {
  return `₩ ${(parsePrice(value) * 1300).toLocaleString("ko-KR")}`;
}

function getAsset(product, type) {
  return product.assets?.find((asset) => asset.type === type)?.url ?? "";
}

function getDetailsValue(product, keys) {
  const details = product.details && typeof product.details === "object" ? product.details : {};
  for (const key of keys) {
    const value = details[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return undefined;
}

function getAttribute(product, key) {
  return product.attributes?.find((attribute) => attribute.key === key);
}

function getAttributeValues(product, key) {
  const attribute = getAttribute(product, key);
  if (!attribute) return [];
  const value = attribute.value ?? attribute.displayValue;
  return Array.isArray(value) ? value : [value].filter(Boolean);
}

function ratingBreakdownObject(rows = []) {
  return Object.fromEntries(rows.map((row) => [row.ratingValue, row.percentage]));
}

function normalizeReview(review) {
  const timestamp = review.reviewTimestamp ?? review.date;
  const date = timestamp
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(timestamp))
    : "";
  return {
    ...review,
    userName: review.userName ?? "Amazon reviewer",
    title: review.title ?? "",
    comment: review.comment ?? review.body ?? review.text ?? "",
    date,
    evidence: review.evidence ?? [],
  };
}

function cleanDemoText(value, product, kind = "description") {
  const text = String(value ?? "").trim();
  if (!/synthetic demo|합성 브랜드|기능 검증용|실제 브랜드 데이터/i.test(text)) {
    return text;
  }

  const productName = product.name ?? "This item";
  const brand = getAttribute(product, "brand")?.displayValue ?? productName.split(" ")[0] ?? "This brand";
  const material = getAttribute(product, "material")?.displayValue;
  const occasion = getAttribute(product, "occasion")?.displayValue;
  const category = product.subCategory?.name ?? product.subCategory ?? product.category?.name ?? product.category ?? "piece";
  const isKoreanText = /\p{Script=Hangul}/u.test(text);

  if (kind === "brand") {
    if (isKoreanText) {
      return `${brand}는 소재, 핏, 리뷰 리스크를 비교하기 쉽게 정리한 상품군을 제공합니다.`;
    }
    return `${brand} focuses on practical pieces with clear materials, fit notes, and review-backed tradeoffs.`;
  }

  if (isKoreanText) {
    return `${productName}은 ${material ? `${material} 소재의 ` : ""}${category}로, ${occasion ? `${occasion} 용도` : "일상 활용"}와 비교 기준을 함께 확인할 수 있습니다.`;
  }

  return `${productName} is a ${material ? `${material} ` : ""}${category} for ${occasion ? String(occasion).toLowerCase() : "everyday"} use, with fit, material, and review signals available for comparison.`;
}

export function normalizeProduct(product) {
  const attributeColors = getAttributeValues(product, "colorFamily");
  const rawColors = product.colors ?? (attributeColors.length ? attributeColors : getDetailsValue(product, ["Color", "Color Name", "Colour"]));
  const colors = Array.isArray(rawColors) ? rawColors : [rawColors].filter(Boolean);
  const rawSizes = product.sizes ?? product.options?.find((option) => option.name.toLowerCase() === "size")?.values ?? getDetailsValue(product, ["Size", "Size Name"]) ?? [];
  const sizes = Array.isArray(rawSizes) ? rawSizes : [rawSizes].filter(Boolean);
  const primaryImagePayload = product.image ?? product.images?.find((image) => image.isPrimary) ?? product.images?.[0] ?? null;
  const primaryImage = product.imageUrl ?? primaryImagePayload?.publicUrl ?? primaryImagePayload?.sourceUrl ?? product.img ?? getAsset(product, "primary") ?? product.assets?.[0]?.url ?? "";
  const descImages = product.descImages ?? product.assets?.filter((asset) => asset.type === "description").map((asset) => asset.url) ?? [];
  const brandImages = product.brandImages ?? product.assets?.filter((asset) => asset.type === "brand").map((asset) => asset.url) ?? [];
  const categoryPath = Array.isArray(product.categoryPath) ? product.categoryPath : [];
  const categoryName = product.category?.name ?? product.category ?? categoryPath[1] ?? product.mainCategory ?? categoryPath[0] ?? "";
  const subCategoryName = product.subCategory?.name ?? product.subCategory ?? categoryPath[categoryPath.length - 1] ?? "";
  const productName = product.name ?? product.title ?? "";
  const productDescription = product.descriptionText ?? product.description ?? product.desc ?? "";
  const reviewCount = product.reviewCount ?? product.ratingNumber ?? product.reviewCountNumber ?? 0;
  const semanticAttributes = product.semanticAttributes ?? [];

  return {
    ...product,
    id: product.id,
    externalId: product.externalId ?? product.sourceProductId,
    category: categoryName,
    categorySlug: product.category?.slug ?? product.categorySlug ?? "",
    subCategory: subCategoryName,
    subCategorySlug: product.subCategory?.slug ?? product.subCategorySlug ?? "",
    name: productName,
    price: product.price?.amount ?? product.price ?? product.priceAmount ?? 0,
    priceNumber: parsePrice(product.price ?? product.priceAmount),
    reviewCount,
    reviewCountNumber: parseReviewCount(reviewCount),
    img: primaryImage,
    image: primaryImagePayload,
    imageFallbackStatus: product.imageFallbackStatus ?? primaryImagePayload?.status ?? "unchecked",
    colors,
    sizes,
    features: product.features?.map((feature) => feature.text ?? feature).filter(Boolean) ?? [],
    descImages,
    brandImages,
    ratingDetail: product.ratingDetail ?? ratingBreakdownObject(product.ratingBreakdown),
    desc: cleanDemoText(productDescription, { ...product, name: productName }),
    brandStory: cleanDemoText(product.brandStory ?? "", product, "brand"),
    reviews: (product.reviews ?? []).map(normalizeReview),
    reviewEvidence: product.reviewEvidence ?? [],
    semanticAttributes,
    ai: product.decisionEvidence ?? null,
    visibleNumber: product.visibleNumber,
  };
}

function uniqueCatalogItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.id ?? item?.sourceProductId ?? item?.parentAsin ?? item?.asin ?? item?.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadCatalog({ locale = "en" } = {}) {
  const cacheKey = locale === "ko" ? "ko" : "en";
  if (catalogLoadCache.has(cacheKey)) {
    return catalogLoadCache.get(cacheKey);
  }

  const params = appendLocale(new URLSearchParams(), locale);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const homeProductRequests = HOME_CATALOG_CATEGORY_SLUGS.map((category) => {
    const categoryParams = appendLocale(new URLSearchParams({ category, limit: "40", view: "card" }), locale);
    return apiJson(`${AMAZON_CATALOG_API_PREFIX}/products?${categoryParams.toString()}`).catch(() => ({ items: [] }));
  });
  const loadPromise = Promise.all([
    apiJson(`${AMAZON_CATALOG_API_PREFIX}/categories${suffix}`),
    apiJson(`${AMAZON_CATALOG_API_PREFIX}/products?${appendLocale(new URLSearchParams({ limit: "160", view: "card" }), locale).toString()}`),
    ...homeProductRequests,
  ])
    .then(([categoryResponse, productResponse, ...homeProductResponses]) => {
      const products = uniqueCatalogItems([
        ...(productResponse.items ?? []),
        ...homeProductResponses.flatMap((response) => response.items ?? []),
      ]);
      return {
        categories: categoryResponse.categories ?? categoryResponse.navigation ?? [],
        navigation: categoryResponse.navigation ?? categoryResponse.categories ?? [],
        products: products.map(normalizeProduct),
        reviews: [],
      };
    })
    .catch((error) => {
      catalogLoadCache.delete(cacheKey);
      throw error;
    });

  catalogLoadCache.set(cacheKey, loadPromise);
  return loadPromise;
}

async function loadAllProducts({ locale = "en" } = {}) {
  const products = [];
  let cursor;
  do {
    const params = appendLocale(new URLSearchParams({ limit: "500" }), locale);
    params.set("offset", String(products.length));
    const page = await apiJson(`${AMAZON_CATALOG_API_PREFIX}/products?${params.toString()}`);
    products.push(...(page.items ?? []));
    cursor = products.length < (page.pagination?.total ?? 0) ? products.length : null;
  } while (cursor !== null && cursor !== undefined);
  return products;
}

export async function searchCatalogProducts({
  query = "",
  category = "",
  subCategory = "",
  color = "",
  brand = "",
  priceMin,
  priceMax,
  ratingMin,
  genderTarget = "",
  occasion = "",
  season = "",
  material = "",
  style = "",
  sleeveLength = "",
  warmthLevelMin,
  comfortLevelMin,
  durabilityLevelMin,
  careEaseLevelMin,
  waterproof,
  limit = 100,
  offset = 0,
  locale = "en",
} = {}) {
  const params = appendLocale(new URLSearchParams({ limit: String(limit), offset: String(offset), view: "card" }), locale);
  if (query) params.set("query", query);
  if (category) params.set("category", category);
  if (subCategory) params.set("subCategory", subCategory);
  if (color) params.set("color", color);
  if (brand) params.set("brand", brand);
  if (priceMin !== undefined && priceMin !== null) params.set("priceMin", String(priceMin));
  if (priceMax !== undefined && priceMax !== null) params.set("priceMax", String(priceMax));
  if (ratingMin !== undefined && ratingMin !== null) params.set("ratingMin", String(ratingMin));
  if (genderTarget) params.set("genderTarget", genderTarget);
  if (occasion) params.set("occasion", occasion);
  if (season) params.set("season", season);
  if (material) params.set("material", material);
  if (style) params.set("style", style);
  if (sleeveLength) params.set("sleeveLength", sleeveLength);
  if (warmthLevelMin !== undefined && warmthLevelMin !== null) params.set("warmthLevelMin", String(warmthLevelMin));
  if (comfortLevelMin !== undefined && comfortLevelMin !== null) params.set("comfortLevelMin", String(comfortLevelMin));
  if (durabilityLevelMin !== undefined && durabilityLevelMin !== null) params.set("durabilityLevelMin", String(durabilityLevelMin));
  if (careEaseLevelMin !== undefined && careEaseLevelMin !== null) params.set("careEaseLevelMin", String(careEaseLevelMin));
  if (waterproof !== undefined && waterproof !== null && waterproof !== "") params.set("waterproof", String(waterproof));
  const page = await apiJson(`${AMAZON_CATALOG_API_PREFIX}/products?${params.toString()}`);
  return (page.items ?? []).map(normalizeProduct);
}

export async function loadCatalogFacets({
  query = "",
  category = "",
  subCategory = "",
  color = "",
  brand = "",
  priceMin,
  priceMax,
  ratingMin,
  genderTarget = "",
  occasion = "",
  season = "",
  material = "",
  style = "",
  sleeveLength = "",
  warmthLevelMin,
  comfortLevelMin,
  durabilityLevelMin,
  careEaseLevelMin,
  waterproof,
  locale = "en",
} = {}) {
  const params = appendLocale(new URLSearchParams(), locale);
  if (query) params.set("query", query);
  if (category) params.set("category", category);
  if (subCategory) params.set("subCategory", subCategory);
  if (color) params.set("color", color);
  if (brand) params.set("brand", brand);
  if (priceMin !== undefined && priceMin !== null) params.set("priceMin", String(priceMin));
  if (priceMax !== undefined && priceMax !== null) params.set("priceMax", String(priceMax));
  if (ratingMin !== undefined && ratingMin !== null) params.set("ratingMin", String(ratingMin));
  if (genderTarget) params.set("genderTarget", genderTarget);
  if (occasion) params.set("occasion", occasion);
  if (season) params.set("season", season);
  if (material) params.set("material", material);
  if (style) params.set("style", style);
  if (sleeveLength) params.set("sleeveLength", sleeveLength);
  if (warmthLevelMin !== undefined && warmthLevelMin !== null) params.set("warmthLevelMin", String(warmthLevelMin));
  if (comfortLevelMin !== undefined && comfortLevelMin !== null) params.set("comfortLevelMin", String(comfortLevelMin));
  if (durabilityLevelMin !== undefined && durabilityLevelMin !== null) params.set("durabilityLevelMin", String(durabilityLevelMin));
  if (careEaseLevelMin !== undefined && careEaseLevelMin !== null) params.set("careEaseLevelMin", String(careEaseLevelMin));
  if (waterproof !== undefined && waterproof !== null && waterproof !== "") params.set("waterproof", String(waterproof));
  return apiJson(`${AMAZON_CATALOG_API_PREFIX}/products/facets?${params.toString()}`);
}

export async function loadProductDetail(productId, { locale = "en" } = {}) {
  const params = appendLocale(new URLSearchParams(), locale);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return normalizeProduct(await apiJson(`${AMAZON_CATALOG_API_PREFIX}/products/${encodeURIComponent(productId)}${suffix}`));
}

export async function runAiQuery(payload) {
  const response = await apiJson(`${AMAZON_AI_API_PREFIX}/query`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    ...response,
    items: (response.items ?? []).map(normalizeProduct),
  };
}

export async function interpretAiQuery(payload) {
  return apiJson(`${AMAZON_AI_API_PREFIX}/interpret`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loadAiEvidence({ queryId, productId, dimension }) {
  const params = new URLSearchParams();
  if (dimension) params.set("dimension", dimension);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiJson(`${AMAZON_AI_API_PREFIX}/query/${encodeURIComponent(queryId)}/items/${encodeURIComponent(productId)}/evidence${suffix}`);
}

export async function compareAiProducts(payload) {
  return apiJson(`${AMAZON_AI_API_PREFIX}/compare`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refineAiQuery(payload) {
  const response = await apiJson(`${AMAZON_AI_API_PREFIX}/refine`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    ...response,
    items: (response.items ?? []).map(normalizeProduct),
  };
}

export async function logInteraction(eventType, payload = {}, sessionId = "local-amazon-session") {
  try {
    await apiJson("/api/logs", {
      method: "POST",
      body: JSON.stringify({
        demo: "amazon",
        sessionId,
        eventType,
        payload,
      }),
    });
  } catch (error) {
    console.warn("Failed to log interaction", error);
  }
}

export function getCategories(productList) {
  return [...new Set(productList.map((product) => product.category).filter(Boolean))];
}

export function getSubCategories(productList, category) {
  return [...new Set(productList.filter((product) => product.category === category).map((product) => product.subCategory).filter(Boolean))];
}

export function getCategoryColorFilters(productList, category) {
  const colorMap = new Map();
  productList
    .filter((product) => product.category === category)
    .forEach((product) => {
      product.colors.forEach((color) => {
        const label = getColorGroupLabel(color);
        if (!colorMap.has(label)) {
          colorMap.set(label, mapColorToCss(color));
        }
      });
    });
  return [...colorMap.entries()].map(([label, css]) => ({ label, css }));
}

export function getProductReviews(_reviews, productId, products = []) {
  return products.find((product) => product.id === productId)?.reviews ?? [];
}

export function getRelatedProducts(product, productList, limit = 5) {
  if (product.relatedProducts?.length) {
    return product.relatedProducts.map(normalizeProduct).slice(0, limit);
  }
  const currentWords = product.name.toLowerCase().split(/\s+/);
  return productList
    .filter((item) => item.id !== product.id)
    .map((item) => {
      const itemWords = item.name.toLowerCase().split(/\s+/);
      const wordScore = itemWords.filter((word) => currentWords.includes(word)).length * 2;
      const categoryScore = item.category === product.category ? 10 : 0;
      return { item, score: categoryScore + wordScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)))
    .slice(0, limit)
    .map(({ item }) => item);
}
