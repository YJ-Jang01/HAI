import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Locale = "en" | "ko";

type ParsedCriterion = {
  key: string;
  value: string | number | boolean | null;
  displayValue: string;
  status: "applied" | "ambiguous" | "open";
};

type Clarification = {
  key: string;
  selectedValue: string | number | boolean | null;
  options: {
    value: string | number | boolean | null;
    label: string;
    estimatedCount?: number;
  }[];
};

type Dimension = {
  key: string;
  active: boolean;
};

type AiItem = {
  id: string;
  name: string;
  imageUrl: string;
  price: { amount: number; currencyCode: string };
  category: { slug: string; name: string } | null;
  subCategory: { slug: string; name: string } | null;
  attributes: {
    key: string;
    value: string | number | boolean | null;
    displayValue: string | number | boolean | null;
  }[];
  decisionEvidence?: {
    reasons?: string[];
    snippetsPreview?: { text?: string; evidenceText?: string }[];
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
  parsedCriteria?: ParsedCriterion[];
  clarifications?: Clarification[];
  comparisonDimensions?: Dimension[];
  items?: AiItem[];
  pagination?: { total?: number };
};

type CriterionExpectation = {
  key: string;
  value?: string | number | boolean | null;
  oneOf?: (string | number | boolean | null)[];
  max?: number;
  min?: number;
};

type AttributeExpectation = {
  key: string;
  value?: string | number | boolean;
  min?: number;
  max?: number;
};

type EdgeCase = {
  id: string;
  locale: Locale;
  query: string;
  category?: string;
  subCategory?: string;
  minItems?: number;
  expectedCriteria: CriterionExpectation[];
  expectedItemAttributes?: AttributeExpectation[];
  priceMax?: number;
  notes: string;
};

type CaseResult = {
  id: string;
  locale: Locale;
  query: string;
  responseMs: number;
  itemCount: number;
  total: number | null;
  eventEffects: {
    searchSubmit: boolean;
    clarificationApply: boolean | "not_applicable";
    compareSelection: boolean | "not_applicable";
    evidenceOpen: boolean | "not_applicable";
  };
  failures: string[];
  appliedRules: string[];
};

const API_BASE_URL = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON_AI_EDGE_TIMEOUT_MS ?? 60_000));
const REQUEST_RETRY_COUNT = Math.max(0, Number(process.env.AMAZON_AI_EDGE_RETRY_COUNT ?? 1));
const CASE_RETRY_COUNT = Math.max(0, Number(process.env.AMAZON_AI_EDGE_CASE_RETRY_COUNT ?? 1));

const CASES: EdgeCase[] = [
  {
    id: "ko-bag-commute-price-particle",
    locale: "ko",
    query: "200$ 이하의 예쁜 가방을 사고 싶어 출퇴근용이야",
    category: "bags",
    priceMax: 200,
    minItems: 1,
    expectedCriteria: [
      { key: "productType", oneOf: ["bags"] },
      { key: "priceMax", value: 200 },
      { key: "occasion", value: "commute" },
    ],
    expectedItemAttributes: [{ key: "occasion", value: "commute" }],
    notes: "Korean particles/endings plus dollar-after-number syntax.",
  },
  {
    id: "ko-laptop-bag-price-aversion",
    locale: "ko",
    query: "회사에 들고 다닐 노트북 들어가는 가방, 150불 넘으면 싫어",
    category: "bags",
    priceMax: 150,
    minItems: 1,
    expectedCriteria: [
      { key: "productType", oneOf: ["bags"] },
      { key: "priceMax", value: 150 },
      { key: "occasion", oneOf: ["commute", "office"] },
      { key: "capacityLiters", min: 0 },
    ],
    expectedItemAttributes: [{ key: "capacityLiters", min: 1 }],
    notes: "Informal Korean price aversion and capacity intent.",
  },
  {
    id: "ko-rain-jacket-not-pricey",
    locale: "ko",
    query: "비 오는 날 입을 자켓 찾는데 방수 되고 너무 비싸진 않았으면",
    category: "outerwear",
    expectedCriteria: [
      { key: "productType", oneOf: ["jackets", "outerwear"] },
      { key: "waterproof", value: true },
    ],
    expectedItemAttributes: [{ key: "waterproof", value: true }],
    notes: "Korean weather wording and soft budget language.",
  },
  {
    id: "ko-wide-toe-shoes",
    locale: "ko",
    query: "발볼넓은 신발 추천해줘 120달러 아래로",
    category: "footwear",
    priceMax: 120,
    expectedCriteria: [
      { key: "productType", oneOf: ["footwear"] },
      { key: "priceMax", value: 120 },
      { key: "toeBoxFit", value: "wide" },
    ],
    expectedItemAttributes: [{ key: "toeBoxFit", value: "wide" }],
    notes: "No-space Korean compound for wide toe box.",
  },
  {
    id: "ko-summer-office-dress-opaque",
    locale: "ko",
    query: "여름에 회사에서 입을 원피스인데 비침 없는 거",
    category: "dresses",
    expectedCriteria: [
      { key: "productType", oneOf: ["dresses"] },
      { key: "season", value: "summer" },
      { key: "occasion", value: "office" },
      { key: "opacityLevel", min: 4 },
    ],
    expectedItemAttributes: [{ key: "opacityLevel", min: 4 }],
    notes: "Korean office and opacity wording.",
  },
  {
    id: "ko-black-light-laptop-backpack",
    locale: "ko",
    query: "블랙 백팩 가볍고 노트북 들어가면 좋겠어 180 이하",
    category: "bags",
    subCategory: "backpacks",
    priceMax: 180,
    expectedCriteria: [
      { key: "productType", oneOf: ["backpacks"] },
      { key: "priceMax", value: 180 },
      { key: "colorFamily", value: "black" },
      { key: "weightGrams", max: 3000 },
      { key: "capacityLiters", min: 1 },
    ],
    notes: "Multiple Korean criteria in one compact sentence.",
  },
  {
    id: "ko-winter-commute-coat-shoulders",
    locale: "ko",
    query: "겨울 출근 코트, 어깨 넓어보이는 건 싫고 250불 밑으로",
    category: "outerwear",
    subCategory: "coats",
    priceMax: 250,
    expectedCriteria: [
      { key: "productType", oneOf: ["coats"] },
      { key: "priceMax", value: 250 },
      { key: "season", value: "winter" },
      { key: "occasion", value: "commute" },
      { key: "shoulderStructure", oneOf: ["natural", "soft", "dropped"] },
    ],
    notes: "Negative body-shape preference should become an objective shoulder criterion.",
  },
  {
    id: "ko-office-loafers-grip",
    locale: "ko",
    query: "로퍼 오피스용 미끄럽지 않은 걸로 160달러 이내",
    category: "footwear",
    subCategory: "loafers",
    priceMax: 160,
    expectedCriteria: [
      { key: "productType", oneOf: ["loafers"] },
      { key: "priceMax", value: 160 },
      { key: "occasion", value: "office" },
      { key: "soleGripLevel", min: 3 },
    ],
    notes: "Korean office suffix and safety-oriented grip wording.",
  },
  {
    id: "ko-soft-washable-knit",
    locale: "ko",
    query: "부드러운 니트 세탁기 가능하고 90달러 이하",
    category: "tops",
    priceMax: 90,
    expectedCriteria: [
      { key: "productType", oneOf: ["sweaters", "knit-tops", "tops"] },
      { key: "priceMax", value: 90 },
      { key: "softnessLevel", min: 4 },
      { key: "machineWashable", value: true },
    ],
    notes: "Korean material-like product term and care constraint.",
  },
  {
    id: "ko-crossbody-strap-daily",
    locale: "ko",
    query: "크로스백 매일 들 건데 끈이 불편하지 않았으면",
    category: "bags",
    subCategory: "crossbody-bags",
    expectedCriteria: [
      { key: "productType", oneOf: ["crossbody-bags"] },
      { key: "occasion", value: "daily" },
      { key: "strapComfortLevel", min: 3 },
    ],
    notes: "Daily-use bag with negative strap wording.",
  },
  {
    id: "ko-rainy-commute-sneakers",
    locale: "ko",
    query: "장마철 출근용 운동화 140 아래",
    category: "footwear",
    subCategory: "sneakers",
    priceMax: 140,
    expectedCriteria: [
      { key: "productType", oneOf: ["sneakers"] },
      { key: "priceMax", value: 140 },
      { key: "occasion", value: "commute" },
      { key: "waterproof", value: true },
    ],
    notes: "Korean monsoon wording should map to weather/waterproof.",
  },
  {
    id: "ko-relaxed-commute-pants",
    locale: "ko",
    query: "너무 붙지 않는 출근용 바지",
    category: "bottoms",
    expectedCriteria: [
      { key: "productType", oneOf: ["pants", "bottoms"] },
      { key: "occasion", value: "commute" },
      { key: "fit", oneOf: ["relaxed", "regular"] },
    ],
    notes: "Negative tight-fit wording should not be ignored.",
  },
  {
    id: "ko-travel-duffel-pockets",
    locale: "ko",
    query: "여행용 더플백 주머니 많고 180 이내",
    category: "bags",
    subCategory: "duffels",
    priceMax: 180,
    expectedCriteria: [
      { key: "productType", oneOf: ["duffels"] },
      { key: "priceMax", value: 180 },
      { key: "occasion", value: "travel" },
      { key: "pocketUtilityLevel", min: 3 },
    ],
    notes: "Korean duffel synonym and storage wording.",
  },
  {
    id: "ko-office-flats-comfort",
    locale: "ko",
    query: "발 편한 플랫슈즈 회사용 120 이하",
    category: "footwear",
    subCategory: "flats",
    priceMax: 120,
    expectedCriteria: [
      { key: "productType", oneOf: ["flats"] },
      { key: "priceMax", value: 120 },
      { key: "occasion", value: "office" },
      { key: "comfortLevel", min: 4 },
    ],
    notes: "Recently added footwear subcategory and Korean comfort wording.",
  },
  {
    id: "en-work-bag-laptop-budget",
    locale: "en",
    query: "uhh can I get a work bag, like laptop-size, not over $200?",
    category: "bags",
    priceMax: 200,
    expectedCriteria: [
      { key: "productType", oneOf: ["bags"] },
      { key: "priceMax", value: 200 },
      { key: "occasion", oneOf: ["office", "commute"] },
      { key: "capacityLiters", min: 1 },
    ],
    notes: "Casual English filler and laptop capacity.",
  },
  {
    id: "en-tote-commute-bucks-max",
    locale: "en",
    query: "need a cute tote for commuting, 200 bucks max pls",
    category: "bags",
    subCategory: "totes",
    priceMax: 200,
    expectedCriteria: [
      { key: "productType", oneOf: ["totes"] },
      { key: "priceMax", value: 200 },
      { key: "occasion", value: "commute" },
    ],
    notes: "Informal bucks/max phrase.",
  },
  {
    id: "en-rainy-office-jacket",
    locale: "en",
    query: "rainy-day jacket, not pricey, commute to office",
    category: "outerwear",
    expectedCriteria: [
      { key: "productType", oneOf: ["jackets", "outerwear"] },
      { key: "waterproof", value: true },
      { key: "occasion", value: "commute" },
    ],
    notes: "Hyphenated weather phrase and soft budget wording.",
  },
  {
    id: "en-wide-toe-shoes",
    locale: "en",
    query: "I don't want shoes that pinch my toes; wide toe box under 120",
    category: "footwear",
    priceMax: 120,
    expectedCriteria: [
      { key: "productType", oneOf: ["footwear"] },
      { key: "priceMax", value: 120 },
      { key: "toeBoxFit", value: "wide" },
    ],
    notes: "Negative fit wording plus explicit toe-box constraint.",
  },
  {
    id: "en-summer-office-dress-opaque",
    locale: "en",
    query: "women's summer dress that's not see-through for work",
    category: "dresses",
    expectedCriteria: [
      { key: "productType", oneOf: ["dresses"] },
      { key: "season", value: "summer" },
      { key: "occasion", value: "office" },
      { key: "genderTarget", value: "female" },
      { key: "opacityLevel", min: 4 },
    ],
    notes: "Possessive gender wording and opacity.",
  },
  {
    id: "en-black-light-laptop-backpack",
    locale: "en",
    query: "black backpack, light, can hold my laptop, below 180",
    category: "bags",
    subCategory: "backpacks",
    priceMax: 180,
    expectedCriteria: [
      { key: "productType", oneOf: ["backpacks"] },
      { key: "priceMax", value: 180 },
      { key: "colorFamily", value: "black" },
      { key: "weightGrams", max: 3000 },
      { key: "capacityLiters", min: 1 },
    ],
    notes: "Comma-separated shorthand.",
  },
  {
    id: "en-winter-coat-shoulders",
    locale: "en",
    query: "winter coat no broad shoulders < $250",
    category: "outerwear",
    subCategory: "coats",
    priceMax: 250,
    expectedCriteria: [
      { key: "productType", oneOf: ["coats"] },
      { key: "priceMax", value: 250 },
      { key: "season", value: "winter" },
      { key: "shoulderStructure", oneOf: ["natural", "soft", "dropped"] },
    ],
    notes: "Symbol price cap and negative shoulder preference.",
  },
  {
    id: "en-office-loafers-grip",
    locale: "en",
    query: "loafers for office, grip matters, no more than 160 dollars",
    category: "footwear",
    subCategory: "loafers",
    priceMax: 160,
    expectedCriteria: [
      { key: "productType", oneOf: ["loafers"] },
      { key: "priceMax", value: 160 },
      { key: "occasion", value: "office" },
      { key: "soleGripLevel", min: 3 },
    ],
    notes: "Office footwear and grip comparison.",
  },
  {
    id: "en-soft-washable-sweater",
    locale: "en",
    query: "soft sweater, machine washable, not over 90",
    category: "tops",
    priceMax: 90,
    expectedCriteria: [
      { key: "productType", oneOf: ["sweaters"] },
      { key: "priceMax", value: 90 },
      { key: "softnessLevel", min: 4 },
      { key: "machineWashable", value: true },
    ],
    notes: "Care plus hand-feel.",
  },
  {
    id: "en-crossbody-strap-daily",
    locale: "en",
    query: "daily crossbody bag but strap shouldn't hurt",
    category: "bags",
    subCategory: "crossbody-bags",
    expectedCriteria: [
      { key: "productType", oneOf: ["crossbody-bags"] },
      { key: "occasion", value: "daily" },
      { key: "strapComfortLevel", min: 3 },
    ],
    notes: "Negative strap comfort wording.",
  },
  {
    id: "en-airport-duffel-pockets",
    locale: "en",
    query: "airport travel duffel with lots of pockets, max 180",
    category: "bags",
    subCategory: "duffels",
    priceMax: 180,
    expectedCriteria: [
      { key: "productType", oneOf: ["duffels"] },
      { key: "priceMax", value: 180 },
      { key: "occasion", value: "travel" },
      { key: "pocketUtilityLevel", min: 3 },
    ],
    notes: "Travel/storage intent.",
  },
  {
    id: "en-office-flats-comfort",
    locale: "en",
    query: "comfortable flats for the office under $120, no heel please",
    category: "footwear",
    subCategory: "flats",
    priceMax: 120,
    expectedCriteria: [
      { key: "productType", oneOf: ["flats"] },
      { key: "priceMax", value: 120 },
      { key: "occasion", value: "office" },
      { key: "comfortLevel", min: 4 },
    ],
    notes: "New flats subcategory plus comfort.",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(path: string, payload: unknown) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= REQUEST_RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => ({}))) as T;
      return { response, json };
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_RETRY_COUNT) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function getJson<T>(path: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);
  const json = (await response.json().catch(() => ({}))) as T;
  return { response, json };
}

function criterionMap(criteria: ParsedCriterion[] = []) {
  return new Map(criteria.map((criterion) => [criterion.key, criterion]));
}

function numbersClose(actual: number, expected: number) {
  return Math.abs(Number(actual) - Number(expected)) < 0.001;
}

function assertCriterion(criteria: ParsedCriterion[] = [], expectation: CriterionExpectation) {
  const criterion = criterionMap(criteria).get(expectation.key);
  if (!criterion) {
    return `missing_criterion:${expectation.key}`;
  }
  const value = criterion.value;
  if (expectation.oneOf && !expectation.oneOf.some((expected) => expected === value)) {
    return `criterion_value_mismatch:${expectation.key}:expected_one_of_${expectation.oneOf.join("|")}:actual_${String(value)}`;
  }
  if (expectation.value !== undefined) {
    if (typeof expectation.value === "number" && typeof value === "number") {
      if (!numbersClose(value, expectation.value)) {
        return `criterion_value_mismatch:${expectation.key}:expected_${expectation.value}:actual_${value}`;
      }
    } else if (value !== expectation.value) {
      return `criterion_value_mismatch:${expectation.key}:expected_${String(expectation.value)}:actual_${String(value)}`;
    }
  }
  if (expectation.min !== undefined && Number(value) < expectation.min) {
    return `criterion_min_mismatch:${expectation.key}`;
  }
  if (expectation.max !== undefined && Number(value) > expectation.max) {
    return `criterion_max_mismatch:${expectation.key}`;
  }
  return null;
}

function attributeMap(item: AiItem) {
  return new Map(item.attributes.map((attribute) => [attribute.key, attribute]));
}

function assertItem(item: AiItem, testCase: EdgeCase) {
  const failures: string[] = [];
  if (!/^https?:\/\//.test(item.imageUrl ?? "")) {
    failures.push("missing_image_url");
  }
  if (!item.decisionEvidence?.reasons?.length) {
    failures.push("missing_decision_reasons");
  }
  if (testCase.category && item.category?.slug !== testCase.category) {
    failures.push(`item_category_mismatch:${item.category?.slug ?? "none"}`);
  }
  if (testCase.subCategory && item.subCategory?.slug !== testCase.subCategory) {
    failures.push(`item_subcategory_mismatch:${item.subCategory?.slug ?? "none"}`);
  }
  if (testCase.priceMax !== undefined && Number(item.price?.amount) > testCase.priceMax) {
    failures.push(`item_price_over_cap:${item.price?.amount}`);
  }

  const attributes = attributeMap(item);
  for (const expected of testCase.expectedItemAttributes ?? []) {
    const attribute = attributes.get(expected.key);
    if (!attribute) {
      failures.push(`item_missing_attribute:${expected.key}`);
      continue;
    }
    if (expected.value !== undefined && attribute.value !== expected.value) {
      failures.push(`item_attribute_value_mismatch:${expected.key}:expected_${String(expected.value)}:actual_${String(attribute.value)}`);
    }
    if (expected.min !== undefined && Number(attribute.value) < expected.min) {
      failures.push(`item_attribute_min_mismatch:${expected.key}`);
    }
    if (expected.max !== undefined && Number(attribute.value) > expected.max) {
      failures.push(`item_attribute_max_mismatch:${expected.key}`);
    }
  }
  return failures;
}

function selectClarification(clarifications: Clarification[] = []) {
  for (const clarification of clarifications) {
    const options = [...clarification.options]
      .filter((option) => option.value !== null)
      .sort((a, b) => (b.estimatedCount ?? 0) - (a.estimatedCount ?? 0));
    const option = options[0];
    if (option) {
      return { key: clarification.key, value: option.value };
    }
  }
  return null;
}

function assertParserRequired(body: AiResponse | undefined, phase: string) {
  const rules = body?.interpretation?.appliedRules ?? [];
  const warning = body?.interpretation?.warning ?? "";
  const text = [...rules, warning].join(" ");
  if (/NL agent (disabled|was unavailable)|deterministic parsing|fallback/i.test(text)) {
    return `${phase}_parser_fallback_used`;
  }
  return null;
}

function hasRetryableAgentFailure(result: CaseResult) {
  return result.failures.some((failure) => /^(interpret|query)_http_502$/.test(failure));
}

async function runCaseAttempt(testCase: EdgeCase): Promise<CaseResult> {
  const startedAt = Date.now();
  const failures: string[] = [];
  const payload = {
    query: testCase.query,
    visibleContext: { page: "qa-ai-edge-flow", locale: testCase.locale, sort: "relevance" },
    session: { sessionId: "amazon-ai-edge-flow-test", locale: testCase.locale },
  };

  const { response: interpretResponse, json: interpretBody } = await postJson<AiResponse>("/api/ai/amazon/interpret", payload);
  if (!interpretResponse.ok) {
    failures.push(`interpret_http_${interpretResponse.status}`);
  }
  if (!interpretBody.queryId) {
    failures.push("interpret_missing_query_id");
  }
  const interpretParserFailure = assertParserRequired(interpretBody, "interpret");
  if (interpretParserFailure) {
    failures.push(interpretParserFailure);
  }

  for (const expectation of testCase.expectedCriteria) {
    const failure = assertCriterion(interpretBody.parsedCriteria, expectation);
    if (failure) {
      failures.push(`interpret_${failure}`);
    }
  }

  const { response: queryResponse, json: queryBody } = await postJson<AiResponse>("/api/ai/amazon/query", {
    ...payload,
    queryId: interpretBody.queryId,
  });
  if (!queryResponse.ok) {
    failures.push(`query_http_${queryResponse.status}`);
  }
  if (!queryBody.queryId) {
    failures.push("query_missing_query_id");
  }
  const queryParserFailure = assertParserRequired(queryBody, "query");
  if (queryParserFailure) {
    failures.push(queryParserFailure);
  }

  for (const expectation of testCase.expectedCriteria) {
    const failure = assertCriterion(queryBody.parsedCriteria, expectation);
    if (failure) {
      failures.push(`query_${failure}`);
    }
  }

  const items = queryBody.items ?? [];
  if (items.length < (testCase.minItems ?? 1)) {
    failures.push(`too_few_items:${items.length}`);
  }
  for (const item of items) {
    failures.push(...assertItem(item, testCase));
  }

  let clarificationApply: CaseResult["eventEffects"]["clarificationApply"] = "not_applicable";
  const selectedClarification = selectClarification(interpretBody.clarifications);
  if (selectedClarification && interpretBody.queryId) {
    const { response, json } = await postJson<AiResponse>("/api/ai/amazon/query", {
      ...payload,
      queryId: interpretBody.queryId,
      criteriaOverrides: [selectedClarification],
    });
    clarificationApply = response.ok && Boolean(json.queryId) && (json.items?.length ?? 0) > 0;
    if (!clarificationApply) {
      failures.push(`clarification_effect_failed:${selectedClarification.key}`);
    }
  }

  let compareSelection: CaseResult["eventEffects"]["compareSelection"] = "not_applicable";
  if (queryBody.queryId && items.length >= 2) {
    const selectedProductIds = items.slice(0, Math.min(4, items.length)).map((item) => item.id);
    const activeDimensions = (queryBody.comparisonDimensions ?? [])
      .filter((dimension) => dimension.active)
      .map((dimension) => dimension.key)
      .slice(0, 5);
    const { response, json } = await postJson<{ comparison?: { rows?: { productId: string }[] } }>("/api/ai/amazon/compare", {
      queryId: queryBody.queryId,
      selectedProductIds,
      activeDimensions,
      locale: testCase.locale,
    });
    const rowIds = json.comparison?.rows?.map((row) => row.productId) ?? [];
    compareSelection = response.ok && selectedProductIds.every((id) => rowIds.includes(id));
    if (!compareSelection) {
      failures.push("compare_effect_failed");
    }
  }

  let evidenceOpen: CaseResult["eventEffects"]["evidenceOpen"] = "not_applicable";
  if (queryBody.queryId && items[0]) {
    const { response, json } = await getJson<{ evidence?: unknown[] }>(
      `/api/ai/amazon/query/${encodeURIComponent(queryBody.queryId)}/items/${encodeURIComponent(items[0].id)}/evidence?dimension=reviewRisks`,
    );
    evidenceOpen = response.ok && Array.isArray(json.evidence);
    if (!evidenceOpen) {
      failures.push("evidence_effect_failed");
    }
  }

  return {
    id: testCase.id,
    locale: testCase.locale,
    query: testCase.query,
    responseMs: Date.now() - startedAt,
    itemCount: items.length,
    total: queryBody.pagination?.total ?? null,
    eventEffects: {
      searchSubmit: interpretResponse.ok && queryResponse.ok && Boolean(queryBody.queryId),
      clarificationApply,
      compareSelection,
      evidenceOpen,
    },
    failures: [...new Set(failures)],
    appliedRules: queryBody.interpretation?.appliedRules ?? interpretBody.interpretation?.appliedRules ?? [],
  };
}

async function runCase(testCase: EdgeCase): Promise<CaseResult> {
  let latest = await runCaseAttempt(testCase);
  for (let attempt = 0; attempt < CASE_RETRY_COUNT && hasRetryableAgentFailure(latest); attempt += 1) {
    latest = await runCaseAttempt(testCase);
  }
  return latest;
}

function summarize(results: CaseResult[]) {
  const failures = results.filter((result) => result.failures.length > 0);
  const responseTimes = results.map((result) => result.responseMs).sort((a, b) => a - b);
  const percentile = (value: number) => responseTimes[Math.min(responseTimes.length - 1, Math.floor((responseTimes.length - 1) * value))] ?? 0;
  const failureCounts = failures
    .flatMap((result) => result.failures)
    .reduce<Record<string, number>>((counts, failure) => {
      counts[failure] = (counts[failure] ?? 0) + 1;
      return counts;
    }, {});

  return {
    generatedAt: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    testedCases: results.length,
    passCount: results.length - failures.length,
    failureCount: failures.length,
    localeCounts: {
      en: results.filter((result) => result.locale === "en").length,
      ko: results.filter((result) => result.locale === "ko").length,
    },
    eventEffectCoverage: {
      searchSubmit: results.filter((result) => result.eventEffects.searchSubmit === true).length,
      clarificationApply: results.filter((result) => result.eventEffects.clarificationApply === true).length,
      compareSelection: results.filter((result) => result.eventEffects.compareSelection === true).length,
      evidenceOpen: results.filter((result) => result.eventEffects.evidenceOpen === true).length,
    },
    responseMs: {
      p50: percentile(0.5),
      p90: percentile(0.9),
      p95: percentile(0.95),
      max: responseTimes[responseTimes.length - 1] ?? 0,
      average: Math.round(results.reduce((sum, result) => sum + result.responseMs, 0) / Math.max(results.length, 1)),
    },
    topFailureTypes: Object.entries(failureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([failure, count]) => ({ failure, count })),
    sampleFailures: failures.slice(0, 30),
  };
}

async function main() {
  const results: CaseResult[] = [];
  for (const testCase of CASES) {
    const result = await runCase(testCase);
    results.push(result);
    const status = result.failures.length ? "FAIL" : "PASS";
    console.log(`[${status}] ${testCase.id} (${testCase.locale}) ${result.itemCount} items ${result.responseMs}ms`);
  }

  const summary = summarize(results);
  const reportDir = resolve("reports");
  await mkdir(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, "amazon-ai-edge-flow-test-latest.json");
  const mdPath = resolve(reportDir, "amazon-ai-edge-flow-test-latest.md");

  await writeFile(jsonPath, JSON.stringify({ summary, cases: CASES, results }, null, 2));
  await writeFile(
    mdPath,
    [
      "# Amazon AI Edge Flow Test",
      "",
      `- Generated at: ${summary.generatedAt}`,
      `- API base URL: ${summary.apiBaseUrl}`,
      `- Tested cases: ${summary.testedCases}`,
      `- English/Korean: ${summary.localeCounts.en}/${summary.localeCounts.ko}`,
      `- Pass: ${summary.passCount}`,
      `- Fail: ${summary.failureCount}`,
      `- Event effects: search=${summary.eventEffectCoverage.searchSubmit}, clarification=${summary.eventEffectCoverage.clarificationApply}, compare=${summary.eventEffectCoverage.compareSelection}, evidence=${summary.eventEffectCoverage.evidenceOpen}`,
      `- Response ms p50/p90/p95/max: ${summary.responseMs.p50}/${summary.responseMs.p90}/${summary.responseMs.p95}/${summary.responseMs.max}`,
      "",
      "## Top Failure Types",
      "",
      summary.topFailureTypes.length ? summary.topFailureTypes.map((item) => `- ${item.failure}: ${item.count}`).join("\n") : "- none",
      "",
      "## Sample Failures",
      "",
      summary.sampleFailures.length
        ? summary.sampleFailures.map((item) => `- ${item.id} (${item.locale}) ${item.query}: ${item.failures.join(", ")}`).join("\n")
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

  if (summary.failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
