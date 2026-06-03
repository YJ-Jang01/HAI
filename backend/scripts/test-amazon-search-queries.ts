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

type SearchCase = {
  id: number;
  kind: "plain" | "structured";
  userQuery: string;
  params: Record<string, string>;
  requiredAttributes: string[];
};

type SearchResult = {
  caseId: number;
  kind: SearchCase["kind"];
  userQuery: string;
  url: string;
  status: number;
  responseMs: number;
  total: number | null;
  returned: number;
  firstItem: string | null;
  failures: string[];
};

const API_BASE_URL = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const TARGET_QUERY_COUNT = Number(process.env.AMAZON_SEARCH_QUERY_COUNT ?? 1000);
const CONCURRENCY = Number(process.env.AMAZON_SEARCH_QUERY_CONCURRENCY ?? 12);
const RESULT_LIMIT = Number(process.env.AMAZON_SEARCH_QUERY_LIMIT ?? 8);

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

const PRODUCT_TERMS: Record<string, string[]> = {
  accessories: ["accessory", "hat", "scarf", "belt", "sunglasses"],
  bags: ["bag", "backpack", "tote", "shopper"],
  bottoms: ["pants", "jeans", "skirt", "bottoms"],
  dresses: ["dress"],
  footwear: ["shoes", "sneakers", "boots", "loafers", "footwear"],
  outerwear: ["coat", "jacket", "parka", "outerwear"],
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

function display(value: unknown) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function productTerm(product: Product) {
  const subcategorySlug = product.subCategory?.slug ?? "";
  const subcategoryTerms = SUBCATEGORY_TERMS[subcategorySlug];
  if (subcategoryTerms?.length) {
    return subcategoryTerms[stableHash(product.id) % subcategoryTerms.length] ?? subcategoryTerms[0]!;
  }
  const categorySlug = product.category?.slug ?? "";
  const terms = PRODUCT_TERMS[categorySlug] ?? [display(product.subCategory?.name ?? product.category?.name ?? "item")];
  const index = stableHash(product.id) % terms.length;
  return terms[index] ?? "item";
}

function isUsefulEnum(value: unknown) {
  return typeof value === "string" && value !== "" && value !== "not_applicable";
}

function withBaseParams(product: Product, query: string, extra: Record<string, string> = {}) {
  return {
    limit: String(RESULT_LIMIT),
    query,
    ...(product.category?.slug ? { category: product.category.slug } : {}),
    ...(product.subCategory?.slug ? { subCategory: product.subCategory.slug } : {}),
    ...extra,
  };
}

function addCase(cases: SearchCase[], seen: Set<string>, kind: SearchCase["kind"], userQuery: string, params: Record<string, string>, requiredAttributes: string[] = []) {
  const key = JSON.stringify({ userQuery: userQuery.toLowerCase(), params });
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  cases.push({
    id: cases.length + 1,
    kind,
    userQuery,
    params,
    requiredAttributes,
  });
}

function addProductCases(cases: SearchCase[], seen: Set<string>, product: Product) {
  const term = productTerm(product);
  const brand = attrLabel(product, "brand");
  const color = attrLabel(product, "colorFamily");
  const material = attrLabel(product, "material");
  const season = attrLabel(product, "season");
  const fit = attrLabel(product, "fit");
  const style = attrLabel(product, "style");
  const occasion = attrLabel(product, "occasion");
  const genderTarget = attrLabel(product, "genderTarget");
  const price = Math.ceil(Number(product.price?.amount ?? 0));

  addCase(cases, seen, "plain", `${color} ${term}`, { limit: String(RESULT_LIMIT), query: `${color} ${term}` }, ["colorFamily"]);
  addCase(cases, seen, "plain", `${material} ${term}`, { limit: String(RESULT_LIMIT), query: `${material} ${term}` }, ["material"]);
  addCase(cases, seen, "plain", `${brand} ${term}`, { limit: String(RESULT_LIMIT), query: `${brand} ${term}` }, ["brand"]);

  if (brand) addCase(cases, seen, "structured", `${brand} ${term}`, withBaseParams(product, term, { "attribute.brand": String(attrValue(product, "brand")) }), ["brand"]);
  if (color) addCase(cases, seen, "structured", `${color} ${term}`, withBaseParams(product, term, { "attribute.colorFamily": String(attrValue(product, "colorFamily")) }), ["colorFamily"]);
  if (material) addCase(cases, seen, "structured", `${material} ${term}`, withBaseParams(product, term, { "attribute.material": String(attrValue(product, "material")) }), ["material"]);
  if (season) addCase(cases, seen, "structured", `${season} ${term}`, withBaseParams(product, term, { "attribute.season": String(attrValue(product, "season")) }), ["season"]);
  if (fit) addCase(cases, seen, "structured", `${fit} fit ${term}`, withBaseParams(product, term, { "attribute.fit": String(attrValue(product, "fit")) }), ["fit"]);
  if (style) addCase(cases, seen, "structured", `${style} style ${term}`, withBaseParams(product, term, { "attribute.style": String(attrValue(product, "style")) }), ["style"]);
  if (occasion) addCase(cases, seen, "structured", `${occasion} ${term}`, withBaseParams(product, term, { "attribute.occasion": String(attrValue(product, "occasion")) }), ["occasion"]);
  if (genderTarget) addCase(cases, seen, "structured", `${genderTarget} ${term}`, withBaseParams(product, term, { "attribute.genderTarget": String(attrValue(product, "genderTarget")) }), ["genderTarget"]);

  addCase(cases, seen, "structured", `${term} under ${price + 5}`, withBaseParams(product, term, { priceMax: String(price + 5) }), []);

  const warmth = Number(attrValue(product, "warmthLevel"));
  if (warmth >= 4) addCase(cases, seen, "structured", `warm ${term}`, withBaseParams(product, term, { "attribute.warmthLevelMin": String(warmth) }), ["warmthLevel"]);

  const comfort = Number(attrValue(product, "comfortLevel"));
  if (comfort >= 4) addCase(cases, seen, "structured", `comfortable ${term}`, withBaseParams(product, term, { "attribute.comfortLevelMin": String(comfort) }), ["comfortLevel"]);

  const durability = Number(attrValue(product, "durabilityLevel"));
  if (durability >= 4) addCase(cases, seen, "structured", `durable ${term}`, withBaseParams(product, term, { "attribute.durabilityLevelMin": String(durability) }), ["durabilityLevel"]);

  const breathability = Number(attrValue(product, "breathabilityLevel"));
  if (breathability >= 4) addCase(cases, seen, "structured", `breathable ${term}`, withBaseParams(product, term, { "attribute.breathabilityLevelMin": String(breathability) }), ["breathabilityLevel"]);

  const stretch = Number(attrValue(product, "stretchLevel"));
  if (stretch >= 3) addCase(cases, seen, "structured", `stretchy ${term}`, withBaseParams(product, term, { "attribute.stretchLevelMin": String(stretch) }), ["stretchLevel"]);

  const softness = Number(attrValue(product, "softnessLevel"));
  if (softness >= 4) addCase(cases, seen, "structured", `soft ${term}`, withBaseParams(product, term, { "attribute.softnessLevelMin": String(softness) }), ["softnessLevel"]);

  const weight = Number(attrValue(product, "weightGrams"));
  if (Number.isFinite(weight) && weight > 0) addCase(cases, seen, "structured", `lightweight ${term}`, withBaseParams(product, term, { "attribute.weightGramsMax": String(weight) }), ["weightGrams"]);

  if (attrValue(product, "waterproof") === true) addCase(cases, seen, "structured", `waterproof ${term}`, withBaseParams(product, term, { "attribute.waterproof": "true" }), ["waterproof"]);
  if (attrValue(product, "machineWashable") === true) addCase(cases, seen, "structured", `machine washable ${term}`, withBaseParams(product, term, { "attribute.machineWashable": "true" }), ["machineWashable"]);

  const shoulder = attrValue(product, "shoulderStructure");
  if (isUsefulEnum(shoulder)) addCase(cases, seen, "structured", `${display(shoulder)} shoulder ${term}`, withBaseParams(product, term, { "attribute.shoulderStructure": String(shoulder) }), ["shoulderStructure"]);

  const waistRise = attrValue(product, "waistRise");
  if (isUsefulEnum(waistRise)) addCase(cases, seen, "structured", `${display(waistRise)} rise ${term}`, withBaseParams(product, term, { "attribute.waistRise": String(waistRise) }), ["waistRise"]);

  const toeBoxFit = attrValue(product, "toeBoxFit");
  if (isUsefulEnum(toeBoxFit)) addCase(cases, seen, "structured", `${display(toeBoxFit)} toe box shoes`, withBaseParams(product, "shoes", { "attribute.toeBoxFit": String(toeBoxFit) }), ["toeBoxFit"]);

  const capacity = Number(attrValue(product, "capacityLiters"));
  if (capacity > 0) addCase(cases, seen, "structured", `large capacity ${term}`, withBaseParams(product, term, { "attribute.capacityLitersMin": String(capacity) }), ["capacityLiters"]);

  const arch = Number(attrValue(product, "archSupportLevel"));
  if (arch >= 3) addCase(cases, seen, "structured", `arch support shoes`, withBaseParams(product, "shoes", { "attribute.archSupportLevelMin": String(arch) }), ["archSupportLevel"]);

  const grip = Number(attrValue(product, "soleGripLevel"));
  if (grip >= 3) addCase(cases, seen, "structured", `grippy sole shoes`, withBaseParams(product, "shoes", { "attribute.soleGripLevelMin": String(grip) }), ["soleGripLevel"]);

  const strap = Number(attrValue(product, "strapComfortLevel"));
  if (strap >= 3) addCase(cases, seen, "structured", `comfortable strap ${term}`, withBaseParams(product, term, { "attribute.strapComfortLevelMin": String(strap) }), ["strapComfortLevel"]);

  const pockets = Number(attrValue(product, "pocketUtilityLevel"));
  if (pockets >= 3) addCase(cases, seen, "structured", `${term} with useful pockets`, withBaseParams(product, term, { "attribute.pocketUtilityLevelMin": String(pockets) }), ["pocketUtilityLevel"]);

  const opacity = Number(attrValue(product, "opacityLevel"));
  if (opacity >= 4) addCase(cases, seen, "structured", `opaque ${term}`, withBaseParams(product, term, { "attribute.opacityLevelMin": String(opacity) }), ["opacityLevel"]);

  const care = Number(attrValue(product, "careComplexityLevel"));
  if (care <= 2) addCase(cases, seen, "structured", `easy care ${term}`, withBaseParams(product, term, { "attribute.careComplexityLevelMax": String(care) }), ["careComplexityLevel"]);

  const lengthFit = attrValue(product, "lengthFit");
  if (isUsefulEnum(lengthFit)) addCase(cases, seen, "structured", `${display(lengthFit)} length ${term}`, withBaseParams(product, term, { "attribute.lengthFit": String(lengthFit) }), ["lengthFit"]);
}

function attributeMap(product: Product) {
  return new Map(product.attributes.map((attribute) => [attribute.key, attribute]));
}

function parseFilterValue(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function validateItem(item: Product, searchCase: SearchCase) {
  const failures: string[] = [];
  const attributes = attributeMap(item);

  if (!item.assets.some((asset) => asset.type === "primary" && /^https?:\/\//.test(asset.url))) {
    failures.push("missing_primary_image");
  }
  if (!item.attributes.length) {
    failures.push("missing_attributes");
  }
  if (searchCase.params.category && item.category?.slug !== searchCase.params.category) {
    failures.push("category_mismatch");
  }
  if (searchCase.params.subCategory && item.subCategory?.slug !== searchCase.params.subCategory) {
    failures.push("subcategory_mismatch");
  }

  for (const key of searchCase.requiredAttributes) {
    if (!attributes.has(key)) {
      failures.push(`missing_required_attribute:${key}`);
    }
  }

  for (const [param, rawValue] of Object.entries(searchCase.params)) {
    if (!param.startsWith("attribute.")) {
      continue;
    }
    const rawName = param.slice("attribute.".length);
    const isMin = rawName.endsWith("Min");
    const isMax = rawName.endsWith("Max");
    const key = isMin || isMax ? rawName.slice(0, -3) : rawName;
    const actual = attributes.get(key)?.value;
    const expected = parseFilterValue(rawValue);

    if (actual === undefined || actual === null) {
      failures.push(`attribute_missing:${key}`);
      continue;
    }
    if (isMin && Number(actual) < Number(expected)) {
      failures.push(`attribute_min_mismatch:${key}`);
    } else if (isMax && Number(actual) > Number(expected)) {
      failures.push(`attribute_max_mismatch:${key}`);
    } else if (!isMin && !isMax && actual !== expected) {
      failures.push(`attribute_value_mismatch:${key}`);
    }
  }

  return failures;
}

async function fetchJson<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function makeUrl(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/api/demos/amazon/products?${search.toString()}`;
}

async function runOne(searchCase: SearchCase): Promise<SearchResult> {
  const url = makeUrl(searchCase.params);
  const startedAt = Date.now();
  const response = await fetch(`${API_BASE_URL}${url}`);
  const responseMs = Date.now() - startedAt;
  const failures: string[] = [];
  let body: { items?: Product[]; pagination?: { total?: number } } = {};

  try {
    body = (await response.json()) as typeof body;
  } catch {
    failures.push("invalid_json_response");
  }

  const items = body.items ?? [];
  if (!response.ok) {
    failures.push(`http_${response.status}`);
  }
  if (items.length === 0) {
    failures.push("zero_results");
  }

  for (const item of items) {
    failures.push(...validateItem(item, searchCase));
  }

  return {
    caseId: searchCase.id,
    kind: searchCase.kind,
    userQuery: searchCase.userQuery,
    url,
    status: response.status,
    responseMs,
    total: body.pagination?.total ?? null,
    returned: items.length,
    firstItem: items[0]?.name ?? null,
    failures: [...new Set(failures)],
  };
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, runWorker));
  return results;
}

function summarize(results: SearchResult[], cases: SearchCase[], products: Product[]) {
  const failures = results.filter((result) => result.failures.length > 0);
  const attributeCoverage = new Set(cases.flatMap((searchCase) => searchCase.requiredAttributes));
  const responseTimes = results.map((result) => result.responseMs).sort((a, b) => a - b);
  const percentile = (value: number) => responseTimes[Math.min(responseTimes.length - 1, Math.floor((responseTimes.length - 1) * value))] ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    targetQueryCount: TARGET_QUERY_COUNT,
    testedQueryCount: results.length,
    productCount: products.length,
    passCount: results.length - failures.length,
    failureCount: failures.length,
    zeroResultCount: results.filter((result) => result.failures.includes("zero_results")).length,
    plainQueryCount: cases.filter((searchCase) => searchCase.kind === "plain").length,
    structuredQueryCount: cases.filter((searchCase) => searchCase.kind === "structured").length,
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

function selectCasesWithAttributeCoverage(cases: SearchCase[], targetCount: number) {
  const sorted = [...cases].sort((a, b) => stableHash(a.userQuery + a.url) - stableHash(b.userQuery + b.url));
  const selected: SearchCase[] = [];
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

async function main() {
  const productResponse = await fetchJson<{ items: Product[]; pagination: { total: number } }>("/api/demos/amazon/products?limit=500");
  const products = productResponse.items ?? [];
  if (products.length === 0) {
    throw new Error("No Amazon products returned from backend.");
  }

  const cases: SearchCase[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    addProductCases(cases, seen, product);
  }

  const selectedCases = selectCasesWithAttributeCoverage(cases, TARGET_QUERY_COUNT);
  if (selectedCases.length < TARGET_QUERY_COUNT) {
    throw new Error(`Generated only ${selectedCases.length} unique query cases; target is ${TARGET_QUERY_COUNT}.`);
  }

  const results = await runWithConcurrency(selectedCases, CONCURRENCY, runOne);
  const summary = summarize(results, selectedCases, products);

  const reportDir = resolve("reports");
  await mkdir(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, "amazon-search-query-test-latest.json");
  const mdPath = resolve(reportDir, "amazon-search-query-test-latest.md");

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
      "# Amazon Search Query Test",
      "",
      `- Generated at: ${summary.generatedAt}`,
      `- API base URL: ${summary.apiBaseUrl}`,
      `- Tested queries: ${summary.testedQueryCount}`,
      `- Pass: ${summary.passCount}`,
      `- Fail: ${summary.failureCount}`,
      `- Zero result: ${summary.zeroResultCount}`,
      `- Plain queries: ${summary.plainQueryCount}`,
      `- Structured queries: ${summary.structuredQueryCount}`,
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
