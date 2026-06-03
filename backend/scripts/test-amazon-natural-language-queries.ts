import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Attribute = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  displayValue: string | number | boolean | null;
  dataType: string;
};

type Product = {
  id: string;
  name: string;
  price: { amount: number; currencyCode: string };
  rating: number;
  reviewCount: number;
  category: { slug: string; name: string } | null;
  subCategory: { slug: string; name: string } | null;
  assets: { type: string; url: string }[];
  attributes: Attribute[];
};

type AiDimension = {
  key: string;
  label: string;
  source: string;
  dataType: string;
  active: boolean;
  hasEvidence: boolean;
};

type AiItem = {
  id: string;
  name: string;
  imageUrl: string;
  price: { amount: number; currencyCode: string };
  rating: number;
  reviewCount: number;
  category: { slug: string; name: string } | null;
  subCategory: { slug: string; name: string } | null;
  attributes: {
    key: string;
    label: string;
    value: string | number | boolean | null;
    displayValue: string | number | boolean | null;
    unit?: string | null;
  }[];
  decisionEvidence?: {
    primaryDifferentiator?: string;
    reasons?: string[];
    tradeoffs?: string[];
    evidenceStrength?: string;
    comparisonDimensions?: string[];
    snippetsPreview?: { text?: string; evidenceText?: string; sentiment?: string; attributeKey?: string }[];
  };
};

type AiResponse = {
  queryId?: string;
  status?: string;
  interpretation?: {
    summary?: string;
    appliedRules?: string[];
    warning?: string;
  };
  comparisonDimensions?: AiDimension[];
  items?: AiItem[];
  pagination?: { total?: number };
};

type NaturalCase = {
  id: number;
  userQuery: string;
  productId: string;
  productName: string;
  expectedCategory?: string;
  expectedSubCategory?: string;
  requiredAttributes: string[];
};

type QueryResult = {
  caseId: number;
  userQuery: string;
  status: number;
  responseMs: number;
  total: number | null;
  returned: number;
  firstItem: string | null;
  dimensions: string[];
  appliedRules: string[];
  relaxed: boolean;
  failures: string[];
};

const API_BASE_URL = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const TARGET_QUERY_COUNT = Number(process.env.AMAZON_NL_QUERY_COUNT ?? 1000);
const CONCURRENCY = Number(process.env.AMAZON_NL_QUERY_CONCURRENCY ?? 8);
const RANDOMIZE_CASES = process.env.AMAZON_NL_QUERY_RANDOMIZE === "true";
const RANDOM_SEED = process.env.AMAZON_NL_QUERY_SEED ?? new Date().toISOString().slice(0, 10);
const REQUIRE_AGENT = process.env.AMAZON_NL_REQUIRE_AGENT === "true";
const PROGRESS_EVERY = Math.max(1, Number(process.env.AMAZON_NL_PROGRESS_EVERY ?? 25));
const REQUEST_RETRY_COUNT = Math.max(0, Number(process.env.AMAZON_NL_REQUEST_RETRY_COUNT ?? 2));
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON_NL_REQUEST_TIMEOUT_MS ?? 60_000));

const COMMON_ATTRIBUTE_KEYS = [
  "brand",
  "material",
  "season",
  "fit",
  "style",
  "occasion",
  "genderTarget",
  "colorFamily",
  "warmthLevel",
  "comfortLevel",
  "durabilityLevel",
  "waterproof",
  "weightGrams",
  "breathabilityLevel",
  "stretchLevel",
  "softnessLevel",
  "machineWashable",
  "shoulderStructure",
  "waistRise",
  "toeBoxFit",
  "capacityLiters",
  "archSupportLevel",
  "soleGripLevel",
  "strapComfortLevel",
  "pocketUtilityLevel",
  "opacityLevel",
  "careComplexityLevel",
  "lengthFit",
];

const PLURAL_OR_PAIR_TERMS = new Set([
  "boots",
  "gloves",
  "jeans",
  "loafers",
  "pants",
  "sandals",
  "scarves",
  "shorts",
  "shoes",
  "sneakers",
  "sunglasses",
  "trail shoes",
  "trousers",
]);

const PRODUCT_TERMS: Record<string, string[]> = {
  accessories: ["accessory", "hat", "scarf", "belt", "sunglasses"],
  bags: ["bag", "backpack", "tote", "crossbody bag"],
  bottoms: ["pants", "jeans", "skirt", "trousers"],
  dresses: ["dress"],
  footwear: ["shoes", "sneakers", "boots", "loafers"],
  outerwear: ["coat", "jacket", "parka", "rain jacket"],
  tops: ["shirt", "top", "sweater", "hoodie"],
};

const SUBCATEGORY_TERMS: Record<string, string[]> = {
  backpacks: ["backpack", "daypack"],
  belts: ["belt"],
  blazers: ["blazer"],
  blouses: ["blouse"],
  boots: ["boots"],
  coats: ["coat"],
  "crossbody-bags": ["crossbody bag"],
  duffels: ["duffel bag"],
  gloves: ["gloves"],
  hats: ["hat"],
  hoodies: ["hoodie"],
  jackets: ["jacket"],
  jeans: ["jeans"],
  "knit-tops": ["knit top"],
  loafers: ["loafers"],
  "midi-dresses": ["midi dress"],
  paddings: ["puffer jacket"],
  pants: ["pants"],
  "rain-jackets": ["rain jacket"],
  sandals: ["sandals"],
  scarves: ["scarf"],
  shirts: ["shirt"],
  "shirt-dresses": ["shirt dress"],
  shorts: ["shorts"],
  "shoulder-bags": ["shoulder bag"],
  skirts: ["skirt"],
  slacks: ["slacks"],
  "slip-dresses": ["slip dress"],
  sneakers: ["sneakers"],
  sunglasses: ["sunglasses"],
  sweaters: ["sweater"],
  "sweater-dresses": ["sweater dress"],
  tees: ["tee"],
  totes: ["tote"],
  "trail-shoes": ["trail shoes"],
  trousers: ["trousers"],
  vests: ["vest"],
  wallets: ["wallet"],
  windbreakers: ["windbreaker"],
  "wrap-dresses": ["wrap dress"],
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = stableHash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function shuffle<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function display(value: unknown) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function attr(product: Product, key: string) {
  return product.attributes.find((attribute) => attribute.key === key);
}

function attrValue(product: Product, key: string) {
  const value = attr(product, key)?.value;
  return value === null || value === undefined ? undefined : value;
}

function attrLabel(product: Product, key: string) {
  const value = attr(product, key)?.displayValue ?? attr(product, key)?.value;
  return value === null || value === undefined ? undefined : display(value);
}

function isUsefulEnum(value: unknown) {
  return typeof value === "string" && value !== "" && value !== "not_applicable";
}

function numericAttr(product: Product, key: string) {
  const value = Number(attrValue(product, key));
  return Number.isFinite(value) ? value : undefined;
}

function booleanAttr(product: Product, key: string) {
  return attrValue(product, key) === true;
}

function productTerm(product: Product) {
  const subcategorySlug = product.subCategory?.slug ?? "";
  const subcategoryTerms = SUBCATEGORY_TERMS[subcategorySlug];
  if (subcategoryTerms?.length) {
    return subcategoryTerms[stableHash(product.id) % subcategoryTerms.length] ?? subcategoryTerms[0]!;
  }

  const categorySlug = product.category?.slug ?? "";
  const terms = PRODUCT_TERMS[categorySlug] ?? [display(product.subCategory?.name ?? product.category?.name ?? "item")];
  return terms[stableHash(product.id) % terms.length] ?? "item";
}

function articleFor(value: string) {
  return /^[aeiou]/.test(value) ? "an" : "a";
}

function nounPhrase(term: string, modifier?: string) {
  const phrase = [modifier, term].filter(Boolean).join(" ").trim();
  if (PLURAL_OR_PAIR_TERMS.has(term) || /s$/i.test(term)) {
    return phrase;
  }
  return `${articleFor(phrase)} ${phrase}`;
}

function genderPhrase(value: unknown) {
  if (value === "female") return "women's";
  if (value === "male") return "men's";
  if (value === "unisex") return "unisex";
  return display(value);
}

function withFallback(value: string | undefined, fallback: string) {
  return value && value !== "not applicable" ? value : fallback;
}

function addCase(cases: NaturalCase[], seen: Set<string>, product: Product, userQuery: string, requiredAttributes: string[] = [], taxonomy: "category" | "subcategory" = "subcategory") {
  const normalized = userQuery.toLowerCase().replace(/\s+/g, " ").trim();
  if (seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  cases.push({
    id: cases.length + 1,
    userQuery,
    productId: product.id,
    productName: product.name,
    expectedCategory: product.category?.slug,
    expectedSubCategory: taxonomy === "subcategory" ? product.subCategory?.slug : undefined,
    requiredAttributes: [...new Set(requiredAttributes)],
  });
}

function addProductCases(cases: NaturalCase[], seen: Set<string>, product: Product) {
  const term = productTerm(product);
  const brand = attrLabel(product, "brand");
  const color = attrLabel(product, "colorFamily");
  const material = attrLabel(product, "material");
  const season = attrLabel(product, "season");
  const fit = attrLabel(product, "fit");
  const style = attrLabel(product, "style");
  const occasion = attrLabel(product, "occasion");
  const gender = genderPhrase(attrValue(product, "genderTarget"));
  const price = Math.ceil(Number(product.price?.amount ?? 0) + 10);

  addCase(cases, seen, product, `I'm looking for ${nounPhrase(term, color)} that would work for ${withFallback(occasion, "daily wear")}.`, ["colorFamily", "occasion"]);
  addCase(cases, seen, product, `Can you show me ${nounPhrase(term, material)} with ${withFallback(fit, "regular")} fit?`, ["material", "fit"]);
  addCase(cases, seen, product, `I want ${gender} ${term} in ${withFallback(color, "a neutral color")} with a ${withFallback(style, "clean")} look.`, ["genderTarget", "colorFamily", "style"]);
  addCase(cases, seen, product, `Find ${nounPhrase(term, season)} from ${withFallback(brand, "a reliable brand")} that does not feel overpriced.`, ["season", "brand"]);
  addCase(cases, seen, product, `Show me ${term} options under $${price} with enough reviews to compare risks.`, []);
  addCase(cases, seen, product, `I need ${nounPhrase(term, style)} for ${withFallback(occasion, "everyday use")} that still feels comfortable.`, ["style", "occasion", "comfortLevel"]);
  addCase(cases, seen, product, `Help me compare ${material ?? "fabric"} ${term} choices by material, fit, and review risks.`, ["material", "fit"]);

  const warmth = numericAttr(product, "warmthLevel");
  if (warmth !== undefined && warmth >= 4) {
    addCase(cases, seen, product, `I need ${nounPhrase(term)} for a cold winter commute, but I still want to see the review risks.`, ["season", "warmthLevel", "occasion"]);
  }

  const comfort = numericAttr(product, "comfortLevel");
  if (comfort !== undefined && comfort >= 4) {
    addCase(cases, seen, product, `Can you find comfortable ${term} that I could wear for several hours?`, ["comfortLevel"]);
  }

  const durability = numericAttr(product, "durabilityLevel");
  if (durability !== undefined && durability >= 4) {
    addCase(cases, seen, product, `I care more about durable construction than the cheapest ${term}.`, ["durabilityLevel"]);
  }

  const breathability = numericAttr(product, "breathabilityLevel");
  if (breathability !== undefined && breathability >= 4) {
    addCase(cases, seen, product, `Show me breathable ${term} for warmer days or indoor use.`, ["breathabilityLevel"]);
  }

  const stretch = numericAttr(product, "stretchLevel");
  if (stretch !== undefined && stretch >= 3) {
    addCase(cases, seen, product, `I want ${term} with some stretch so I can move freely.`, ["stretchLevel"]);
  }

  const softness = numericAttr(product, "softnessLevel");
  if (softness !== undefined && softness >= 4) {
    addCase(cases, seen, product, `Find soft ${term} that will not feel scratchy on long days.`, ["softnessLevel"]);
  }

  const weight = numericAttr(product, "weightGrams");
  if (weight !== undefined && weight > 0) {
    addCase(cases, seen, product, `I prefer lightweight ${term} because I hate carrying heavy things all day.`, ["weightGrams"]);
  }

  if (booleanAttr(product, "waterproof")) {
    addCase(cases, seen, product, `I need waterproof ${term} that can handle rain without becoming annoying.`, ["waterproof"]);
  }

  if (booleanAttr(product, "machineWashable")) {
    addCase(cases, seen, product, `Can you find machine washable ${term} with easy care?`, ["machineWashable", "careComplexityLevel"]);
  }

  const shoulder = attrValue(product, "shoulderStructure");
  if (isUsefulEnum(shoulder)) {
    addCase(cases, seen, product, `I want ${nounPhrase(term)} that will not make my shoulders look too broad.`, ["shoulderStructure"]);
  }

  const waistRise = attrValue(product, "waistRise");
  if (isUsefulEnum(waistRise)) {
    addCase(cases, seen, product, `Show me ${display(waistRise)} rise ${term} with review notes about fit.`, ["waistRise", "fit"]);
  }

  const toeBoxFit = attrValue(product, "toeBoxFit");
  if (isUsefulEnum(toeBoxFit)) {
    addCase(cases, seen, product, `I need ${display(toeBoxFit)} toe box ${term} for long walks.`, ["toeBoxFit"], "category");
  }

  const capacity = numericAttr(product, "capacityLiters");
  if (capacity !== undefined && capacity > 0) {
    addCase(cases, seen, product, `I need ${nounPhrase(term)} that can carry a laptop and has enough room for daily gear.`, ["capacityLiters"]);
  }

  const arch = numericAttr(product, "archSupportLevel");
  if (arch !== undefined && arch >= 3) {
    addCase(cases, seen, product, `Find ${term} with real arch support for walking around campus.`, ["archSupportLevel"], "category");
  }

  const grip = numericAttr(product, "soleGripLevel");
  if (grip !== undefined && grip >= 3) {
    addCase(cases, seen, product, `I want ${term} with good grip so they do not feel slippery.`, ["soleGripLevel"], "category");
  }

  const strap = numericAttr(product, "strapComfortLevel");
  if (strap !== undefined && strap >= 3) {
    addCase(cases, seen, product, `Can you show ${term} where the straps stay comfortable?`, ["strapComfortLevel"]);
  }

  const pockets = numericAttr(product, "pocketUtilityLevel");
  if (pockets !== undefined && pockets >= 3) {
    addCase(cases, seen, product, `I want ${term} with useful pockets or storage, not just a clean look.`, ["pocketUtilityLevel"]);
  }

  const opacity = numericAttr(product, "opacityLevel");
  if (opacity !== undefined && opacity >= 4) {
    addCase(cases, seen, product, `Find opaque ${term} that will not look see-through in daylight.`, ["opacityLevel"]);
  }

  const care = numericAttr(product, "careComplexityLevel");
  if (care !== undefined && care <= 2) {
    addCase(cases, seen, product, `I need low maintenance ${term} with simple care requirements.`, ["careComplexityLevel"]);
  }

  const lengthFit = attrValue(product, "lengthFit");
  if (isUsefulEnum(lengthFit)) {
    addCase(cases, seen, product, `Show me ${display(lengthFit)} length ${term} and help me compare the fit tradeoffs.`, ["lengthFit", "fit"]);
  }
}

function selectCasesWithAttributeCoverage(cases: NaturalCase[], targetCount: number) {
  const sorted = RANDOMIZE_CASES
    ? shuffle(cases, RANDOM_SEED)
    : [...cases].sort((a, b) => stableHash(a.userQuery + a.productId) - stableHash(b.userQuery + b.productId));
  const selected: NaturalCase[] = [];
  const selectedIds = new Set<number>();

  for (const key of COMMON_ATTRIBUTE_KEYS) {
    const candidate = sorted.find((searchCase) => !selectedIds.has(searchCase.id) && searchCase.requiredAttributes.includes(key));
    if (candidate) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  for (const candidate of sorted) {
    if (selected.length >= targetCount) {
      break;
    }
    if (!selectedIds.has(candidate.id)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  return selected;
}

async function fetchJson<T>(path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= REQUEST_RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);
  if (!response.ok) {
        if (response.status >= 500 && attempt < REQUEST_RETRY_COUNT) {
          await response.text().catch(() => "");
          await sleep(1000 * (attempt + 1));
          continue;
        }
    throw new Error(`${path} failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt >= REQUEST_RETRY_COUNT) {
        break;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

async function runOne(searchCase: NaturalCase): Promise<QueryResult> {
  const startedAt = Date.now();
  let response: Response | undefined;
  let requestError: unknown;
  for (let attempt = 0; attempt <= REQUEST_RETRY_COUNT; attempt += 1) {
    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/api/ai/amazon/query`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: searchCase.userQuery,
          visibleContext: { page: "amazon-search-test" },
          session: { sessionId: "amazon-nl-query-test" },
        }),
      });
      if (response.status >= 500 && attempt < REQUEST_RETRY_COUNT) {
        await response.text().catch(() => "");
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    } catch (error) {
      requestError = error;
      if (attempt < REQUEST_RETRY_COUNT) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  const responseMs = Date.now() - startedAt;
  const failures: string[] = [];
  let body: AiResponse = {};

  if (!response) {
    const message = requestError instanceof Error ? requestError.message : String(requestError);
    return {
      caseId: searchCase.id,
      userQuery: searchCase.userQuery,
      status: 0,
      responseMs,
      total: null,
      returned: 0,
      firstItem: null,
      dimensions: [],
      appliedRules: [],
      relaxed: false,
      failures: [`request_failed:${message}`],
    };
  }

  try {
    body = (await response.json()) as AiResponse;
  } catch {
    failures.push("invalid_json_response");
  }

  if (!response.ok) {
    failures.push(`http_${response.status}`);
  }

  const items = body.items ?? [];
  const dimensions = body.comparisonDimensions?.map((dimension) => dimension.key) ?? [];
  const dimensionSet = new Set(dimensions);
  const appliedRules = body.interpretation?.appliedRules ?? [];
  const relaxed = appliedRules.some((rule) => /relaxed|taxonomy-level/i.test(rule));
  const usedBackendOnlyFallback = appliedRules.some((rule) => /NL agent disabled|NL agent was unavailable/i.test(rule));

  if (!body.queryId) {
    failures.push("missing_query_id");
  }
  if (items.length === 0) {
    failures.push("zero_results");
  }
  if (dimensions.length < 3) {
    failures.push("too_few_dimensions");
  }
  if (REQUIRE_AGENT && usedBackendOnlyFallback) {
    failures.push("nl_agent_not_used");
  }

  for (const key of searchCase.requiredAttributes) {
    if (!dimensionSet.has(key)) {
      failures.push(`missing_dimension:${key}`);
    }
  }

  for (const item of items) {
    if (!/^https?:\/\//.test(item.imageUrl ?? "")) {
      failures.push("missing_image_url");
    }
    if (!item.attributes?.length) {
      failures.push("missing_item_attributes");
    }
    if (!item.decisionEvidence?.reasons?.length) {
      failures.push("missing_decision_reasons");
    }
    if (searchCase.expectedCategory && item.category?.slug !== searchCase.expectedCategory) {
      failures.push("category_mismatch");
    }
    if (searchCase.expectedSubCategory && item.subCategory?.slug !== searchCase.expectedSubCategory) {
      failures.push("subcategory_mismatch");
    }

    const itemAttributeKeys = new Set(item.attributes?.map((attribute) => attribute.key) ?? []);
    for (const key of searchCase.requiredAttributes) {
      if (!itemAttributeKeys.has(key)) {
        failures.push(`missing_item_attribute:${key}`);
      }
    }
  }

  return {
    caseId: searchCase.id,
    userQuery: searchCase.userQuery,
    status: response.status,
    responseMs,
    total: body.pagination?.total ?? null,
    returned: items.length,
    firstItem: items[0]?.name ?? null,
    dimensions,
    appliedRules,
    relaxed,
    failures: [...new Set(failures)],
  };
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>, onComplete?: (result: R, completed: number) => Promise<void>) {
  const results: R[] = [];
  let cursor = 0;
  let completed = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const result = await worker(items[index]!);
      results[index] = result;
      completed += 1;
      if (onComplete) {
        await onComplete(result, completed);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, runWorker));
  return results;
}

function summarize(results: QueryResult[], cases: NaturalCase[], products: Product[]) {
  const failures = results.filter((result) => result.failures.length > 0);
  const attributeCoverage = new Set(cases.flatMap((searchCase) => searchCase.requiredAttributes));
  const responseTimes = results.map((result) => result.responseMs).sort((a, b) => a - b);
  const percentile = (value: number) => responseTimes[Math.min(responseTimes.length - 1, Math.floor((responseTimes.length - 1) * value))] ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    targetQueryCount: TARGET_QUERY_COUNT,
    testedQueryCount: results.length,
    randomizeCases: RANDOMIZE_CASES,
    randomSeed: RANDOM_SEED,
    requireNlAgent: REQUIRE_AGENT,
    productCount: products.length,
    passCount: results.length - failures.length,
    failureCount: failures.length,
    zeroResultCount: results.filter((result) => result.failures.includes("zero_results")).length,
    relaxedCount: results.filter((result) => result.relaxed).length,
    attributeCoverage: {
      coveredKeys: [...attributeCoverage].sort(),
      missingCommonKeys: COMMON_ATTRIBUTE_KEYS.filter((key) => !attributeCoverage.has(key)),
    },
    responseMs: {
      min: responseTimes[0] ?? 0,
      p50: percentile(0.5),
      p90: percentile(0.9),
      p95: percentile(0.95),
      max: responseTimes[responseTimes.length - 1] ?? 0,
      average: Math.round(results.reduce((sum, result) => sum + result.responseMs, 0) / Math.max(results.length, 1)),
    },
    topFailureTypes: Object.entries(
      failures
        .flatMap((result) => result.failures)
        .reduce<Record<string, number>>((counts, failure) => {
          counts[failure] = (counts[failure] ?? 0) + 1;
          return counts;
        }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([failure, count]) => ({ failure, count })),
    sampleFailures: failures.slice(0, 20),
  };
}

async function main() {
  const startedAt = Date.now();
  const productResponse = await fetchJson<{ items: Product[]; pagination: { total: number } }>("/api/demos/amazon/products?limit=500");
  const products = productResponse.items ?? [];
  if (products.length === 0) {
    throw new Error("No Amazon products returned from backend.");
  }

  const cases: NaturalCase[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    addProductCases(cases, seen, product);
  }

  const selectedCases = selectCasesWithAttributeCoverage(cases, TARGET_QUERY_COUNT);
  if (selectedCases.length < TARGET_QUERY_COUNT) {
    throw new Error(`Generated only ${selectedCases.length} unique natural-language query cases; target is ${TARGET_QUERY_COUNT}.`);
  }

  const reportDir = resolve("reports");
  await mkdir(reportDir, { recursive: true });
  const progressPath = resolve(reportDir, "amazon-natural-language-query-test-progress.json");
  const jsonPath = resolve(reportDir, "amazon-natural-language-query-test-latest.json");
  const mdPath = resolve(reportDir, "amazon-natural-language-query-test-latest.md");

  const partialResults: QueryResult[] = [];
  const results = await runWithConcurrency(selectedCases, CONCURRENCY, runOne, async (result, completed) => {
    partialResults.push(result);
    if (completed % PROGRESS_EVERY !== 0 && completed !== selectedCases.length) {
      return;
    }
    const failures = partialResults.filter((item) => item.failures.length > 0);
    await writeFile(
      progressPath,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          apiBaseUrl: API_BASE_URL,
          randomizeCases: RANDOMIZE_CASES,
          randomSeed: RANDOM_SEED,
          requireNlAgent: REQUIRE_AGENT,
          completed,
          total: selectedCases.length,
          passCount: completed - failures.length,
          failureCount: failures.length,
          zeroResultCount: partialResults.filter((item) => item.failures.includes("zero_results")).length,
          elapsedMs: Date.now() - startedAt,
          latestCase: {
            caseId: result.caseId,
            userQuery: result.userQuery,
            status: result.status,
            returned: result.returned,
            failures: result.failures,
          },
          sampleFailures: failures.slice(0, 10),
        },
        null,
        2,
      ),
    );
  });
  const summary = summarize(results, selectedCases, products);

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        summary,
        cases: selectedCases,
        results,
      },
      null,
      2,
    ),
  );

  await writeFile(
    mdPath,
    [
      "# Amazon Natural-Language Query Test",
      "",
      `- Generated at: ${summary.generatedAt}`,
      `- API base URL: ${summary.apiBaseUrl}`,
      `- Tested natural-language queries: ${summary.testedQueryCount}`,
      `- Randomized cases: ${summary.randomizeCases}`,
      `- Random seed: ${summary.randomSeed}`,
      `- Required NL agent: ${summary.requireNlAgent}`,
      `- Pass: ${summary.passCount}`,
      `- Fail: ${summary.failureCount}`,
      `- Zero result: ${summary.zeroResultCount}`,
      `- Relaxed/fallback responses: ${summary.relaxedCount}`,
      `- Attribute keys covered: ${summary.attributeCoverage.coveredKeys.join(", ")}`,
      `- Missing common attribute keys: ${summary.attributeCoverage.missingCommonKeys.join(", ") || "none"}`,
      `- Response ms p50/p90/p95/max: ${summary.responseMs.p50}/${summary.responseMs.p90}/${summary.responseMs.p95}/${summary.responseMs.max}`,
      "",
      "## Top Failure Types",
      "",
      summary.topFailureTypes.length ? summary.topFailureTypes.map((item) => `- ${item.failure}: ${item.count}`).join("\n") : "- none",
      "",
      "## Sample Failures",
      "",
      summary.sampleFailures.length
        ? summary.sampleFailures.map((item) => `- #${item.caseId} ${item.userQuery}: ${item.failures.join(", ")}`).join("\n")
        : "- none",
      "",
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        summary,
        reportFiles: {
          json: jsonPath,
          markdown: mdPath,
          progress: progressPath,
        },
      },
      null,
      2,
    ),
  );

  if (summary.failureCount > 0 || summary.attributeCoverage.missingCommonKeys.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
