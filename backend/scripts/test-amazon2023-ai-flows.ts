import { mkdir, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { resolve } from "node:path";

type AiItem = {
  id: string;
  title?: string;
  name?: string;
  imageUrl?: string | null;
  price?: number | { amount?: number };
  rating?: number | null;
  reviewCount?: number;
  semanticAttributes?: { key: string; valueText?: string | null; valueNumber?: number | null; valueBoolean?: boolean | null; confidence?: number | null }[];
  decisionEvidence?: {
    reasons?: string[];
    tradeoffs?: string[];
  };
};

type CriteriaValue = string | number | boolean | null;
type CriteriaOverride = { key: string; value: CriteriaValue };
type ParsedCriterion = { key: string; value: CriteriaValue; status: string };
type Clarification = {
  key: string;
  options: {
    value: CriteriaValue;
    label?: string;
    estimatedCount?: number;
    criteriaOverrides?: CriteriaOverride[];
  }[];
};

type AiResponse = {
  queryId?: string;
  status?: string;
  parsedCriteria?: ParsedCriterion[];
  clarifications?: Clarification[];
  comparisonDimensions?: { key: string; active: boolean }[];
  items?: AiItem[];
  pagination?: { total?: number };
  error?: { code?: string; message?: string };
};

type CaseResult = {
  id: string;
  query: string;
  itemCount: number;
  total: number | null;
  responseMs: number;
  failures: string[];
};

type TestCase = {
  id: string;
  query: string;
  minItems: number;
  expectedCriteria: string[];
  expectedCriterionValues?: Record<string, CriteriaValue>;
  forbiddenCriterionValues?: Record<string, CriteriaValue[]>;
  expectedClarifications?: string[];
  expectedSemanticKeys?: string[];
};

let apiBaseUrl = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON2023_AI_QA_TIMEOUT_MS ?? 30_000));

const CASES: TestCase[] = [
  {
    id: "ko-men-party-shirt",
    query: "남성 파티용 셔츠",
    minItems: 1,
    expectedCriteria: ["category", "productType", "genderTarget", "partyIntent"],
    expectedCriterionValues: { category: "Shirts", productType: "Shirts", genderTarget: "men" },
    forbiddenCriterionValues: { style: ["formal"], occasion: ["formal"] },
    expectedClarifications: ["partyIntent"],
    expectedSemanticKeys: ["genderTarget"],
  },
  {
    id: "ko-men-vacation-shirt",
    query: "남성 피서용 셔츠",
    minItems: 1,
    expectedCriteria: ["category", "productType", "genderTarget", "season", "occasion"],
    expectedCriterionValues: { category: "Shirts", productType: "Shirts", genderTarget: "men", season: "summer", occasion: "travel" },
    forbiddenCriterionValues: { season: ["winter"], warmthLevel: ["4+", "3+"] },
    expectedSemanticKeys: ["genderTarget", "season", "occasion"],
  },
  {
    id: "ko-coat-strict-product-type",
    query: "코트",
    minItems: 1,
    expectedCriteria: ["category", "productType"],
    expectedCriterionValues: { category: "Coats", productType: "Coats" },
  },
  {
    id: "ko-women-interview-shoes",
    query: "여성 구두 면접용",
    minItems: 1,
    expectedCriteria: ["category", "genderTarget", "occasion", "style"],
    expectedCriterionValues: { category: "Shoes", genderTarget: "women", occasion: "office", style: "formal" },
    expectedSemanticKeys: ["genderTarget", "occasion", "style"],
  },
  {
    id: "ko-pretty-summer-short-sleeve-shirt",
    query: "예쁜 여름 반팔 셔츠",
    minItems: 1,
    expectedCriteria: ["category", "season", "sleeveLength", "styleIntent"],
    expectedClarifications: ["styleIntent"],
    expectedSemanticKeys: ["season"],
  },
  {
    id: "ko-women-winter-commute-coat",
    query: "여성용 겨울 출근 코트 120달러 이하",
    minItems: 1,
    expectedCriteria: ["category", "priceMax", "genderTarget", "season", "occasion"],
    expectedSemanticKeys: ["genderTarget", "season"],
  },
  {
    id: "ko-school-comfort-backpack",
    query: "통학용 가볍고 편한 백팩",
    minItems: 1,
    expectedCriteria: ["category", "occasion", "comfortIntent"],
    expectedClarifications: ["comfortIntent"],
    expectedSemanticKeys: ["occasion", "comfortLevel"],
  },
  {
    id: "ko-waterproof-men-winter-boots",
    query: "방수되는 남성용 겨울 부츠",
    minItems: 1,
    expectedCriteria: ["category", "genderTarget", "season", "waterproof"],
    expectedSemanticKeys: ["genderTarget", "season", "waterproof"],
  },
  {
    id: "ko-cotton-daily-shirt",
    query: "면 소재 데일리 셔츠",
    minItems: 1,
    expectedCriteria: ["category", "material", "occasion", "style"],
    expectedSemanticKeys: ["material", "occasion", "style"],
  },
  {
    id: "en-comfort-party-shirt-men",
    query: "comfortable party shirt for men",
    minItems: 1,
    expectedCriteria: ["category", "productType", "genderTarget", "comfortIntent", "partyIntent"],
    expectedCriterionValues: { category: "Shirts", productType: "Shirts", genderTarget: "men" },
    forbiddenCriterionValues: { style: ["formal"], occasion: ["formal"] },
    expectedClarifications: ["comfortIntent", "partyIntent"],
    expectedSemanticKeys: ["genderTarget"],
  },
  {
    id: "en-women-interview-shoes",
    query: "women interview shoes",
    minItems: 1,
    expectedCriteria: ["category", "genderTarget", "occasion", "style"],
    expectedCriterionValues: { category: "Shoes", genderTarget: "women", occasion: "office", style: "formal" },
    expectedSemanticKeys: ["genderTarget", "occasion", "style"],
  },
  {
    id: "en-comfort-commute-women-shoes",
    query: "comfortable commute shoes under 120 dollars for women",
    minItems: 1,
    expectedCriteria: ["category", "priceMax", "genderTarget", "occasion"],
    expectedSemanticKeys: ["genderTarget", "comfortLevel", "occasion"],
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${apiBaseUrl}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function startInProcessServer() {
  if (process.env.AMAZON2023_AI_QA_INPROCESS !== "true") {
    return null;
  }
  const { app } = await import("../src/app.js");
  const server = await new Promise<Server>((resolveListen, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolveListen(listener));
    listener.on("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    throw new Error("Could not determine in-process server port.");
  }
  apiBaseUrl = `http://127.0.0.1:${address.port}`;
  return server;
}

async function postJson<T>(path: string, payload: unknown) {
  const response = await fetchWithTimeout(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as T;
  return { response, json };
}

async function getJson<T>(path: string) {
  const response = await fetchWithTimeout(path);
  const json = (await response.json().catch(() => ({}))) as T;
  return { response, json };
}

function hasUsableImage(item: AiItem) {
  return typeof item.imageUrl === "string" && /^https?:\/\//i.test(item.imageUrl);
}

function missingKeys(expected: string[] | undefined, actual: ParsedCriterion[] | undefined) {
  const actualKeys = new Set((actual ?? []).map((criterion) => criterion.key));
  return (expected ?? []).filter((key) => !actualKeys.has(key));
}

function criterionValue(criteria: ParsedCriterion[] | undefined, key: string) {
  return (criteria ?? []).find((criterion) => criterion.key === key)?.value;
}

function normalizedCriterionValue(value: CriteriaValue | undefined) {
  if (value === undefined || value === null) return "";
  return String(value).toLowerCase();
}

function validateCriterionValues(prefix: string, criteria: ParsedCriterion[] | undefined, testCase: TestCase, failures: string[]) {
  for (const [key, expected] of Object.entries(testCase.expectedCriterionValues ?? {})) {
    const actual = criterionValue(criteria, key);
    if (normalizedCriterionValue(actual) !== normalizedCriterionValue(expected)) {
      failures.push(`${prefix}_criterion_value_mismatch:${key}:expected=${String(expected)}:actual=${String(actual)}`);
    }
  }
  for (const [key, forbiddenValues] of Object.entries(testCase.forbiddenCriterionValues ?? {})) {
    const actual = normalizedCriterionValue(criterionValue(criteria, key));
    if (actual && forbiddenValues.map(normalizedCriterionValue).includes(actual)) {
      failures.push(`${prefix}_criterion_forbidden_value:${key}:${actual}`);
    }
  }
}

function validateClarifications(prefix: string, clarifications: Clarification[] | undefined, expected: string[] | undefined, failures: string[]) {
  for (const key of expected ?? []) {
    const clarification = (clarifications ?? []).find((item) => item.key === key);
    if (!clarification) {
      failures.push(`${prefix}_missing_clarification:${key}`);
      continue;
    }
    if (!clarification.options.length) {
      failures.push(`${prefix}_empty_clarification_options:${key}`);
      continue;
    }
    for (const option of clarification.options) {
      if (!option.criteriaOverrides?.length) failures.push(`${prefix}_clarification_missing_overrides:${key}:${String(option.value)}`);
      if (option.estimatedCount !== undefined && (!Number.isFinite(option.estimatedCount) || option.estimatedCount < 0)) {
        failures.push(`${prefix}_invalid_clarification_estimate:${key}:${String(option.estimatedCount)}`);
      }
    }
  }
}

function criterionKeyForOverride(key: string) {
  if (key === "warmthLevelMin") return "warmthLevel";
  if (key === "comfortLevelMin") return "comfortLevel";
  if (key === "durabilityLevelMin") return "durabilityLevel";
  if (key === "careEaseLevelMin") return "careEaseLevel";
  return key;
}

function sameTopProducts(left: AiItem[], right: AiItem[]) {
  return left.slice(0, 8).map((item) => item.id).join("|") === right.slice(0, 8).map((item) => item.id).join("|");
}

async function runCase(testCase: TestCase): Promise<CaseResult> {
  const startedAt = Date.now();
  const failures: string[] = [];
  const payload = {
    query: testCase.query,
    visibleContext: { page: "amazon2023-ai-qa" },
    session: { sessionId: "amazon2023-ai-qa", locale: testCase.id.startsWith("ko") ? "ko" : "en" },
  };

  const interpret = await postJson<AiResponse>("/api/ai/amazon2023/interpret", payload);
  if (!interpret.response.ok) failures.push(`interpret_http_${interpret.response.status}:${interpret.json.error?.code ?? "unknown"}`);
  if (!interpret.json.queryId) failures.push("interpret_missing_query_id");
  if (!interpret.json.parsedCriteria?.length) failures.push("interpret_missing_criteria");
  for (const key of missingKeys(testCase.expectedCriteria, interpret.json.parsedCriteria)) {
    failures.push(`interpret_missing_expected_criteria:${key}`);
  }
  validateCriterionValues("interpret", interpret.json.parsedCriteria, testCase, failures);
  validateClarifications("interpret", interpret.json.clarifications, testCase.expectedClarifications, failures);

  const query = await postJson<AiResponse>("/api/ai/amazon2023/query", {
    ...payload,
    queryId: interpret.json.queryId,
  });
  if (!query.response.ok) failures.push(`query_http_${query.response.status}:${query.json.error?.code ?? "unknown"}`);
  for (const key of missingKeys(testCase.expectedCriteria, query.json.parsedCriteria)) {
    failures.push(`query_missing_expected_criteria:${key}`);
  }
  validateCriterionValues("query", query.json.parsedCriteria, testCase, failures);
  validateClarifications("query", query.json.clarifications, testCase.expectedClarifications, failures);
  const items = query.json.items ?? [];
  if (items.length < testCase.minItems) failures.push(`too_few_items:${items.length}`);
  if (!query.json.comparisonDimensions?.length) failures.push("missing_comparison_dimensions");
  for (const item of items.slice(0, 10)) {
    if (!item.name && !item.title) failures.push(`item_missing_name:${item.id}`);
    if (!hasUsableImage(item)) failures.push(`item_missing_image:${item.id}`);
    if (!item.decisionEvidence?.reasons?.length) failures.push(`item_missing_decision_reasons:${item.id}`);
  }
  for (const expectedKey of testCase.expectedSemanticKeys ?? []) {
    const matched = items.slice(0, 10).some((item) => item.semanticAttributes?.some((attribute) => attribute.key === expectedKey));
    if (!matched) failures.push(`items_missing_semantic_attribute:${expectedKey}`);
  }

  const expectedClarification = (testCase.expectedClarifications ?? [])[0];
  const clarification = (query.json.clarifications ?? interpret.json.clarifications ?? []).find((item) => item.key === expectedClarification);
  const option = clarification?.options.find((item) => item.criteriaOverrides?.length);
  if (query.json.queryId && clarification && option) {
    const criteriaOverrides = option.criteriaOverrides ?? [{ key: clarification.key, value: option.value }];
    const refined = await postJson<AiResponse>("/api/ai/amazon2023/query", {
      ...payload,
      queryId: query.json.queryId,
      criteriaOverrides,
    });
    if (!refined.response.ok) failures.push(`clarification_query_http_${refined.response.status}:${refined.json.error?.code ?? "unknown"}`);
    const refinedCriteriaKeys = new Set((refined.json.parsedCriteria ?? []).map((criterion) => criterion.key));
    const usefulOverrideKeys = criteriaOverrides.map((override) => criterionKeyForOverride(override.key)).filter((key) => key !== "semanticConfidenceMin");
    if (!usefulOverrideKeys.some((key) => refinedCriteriaKeys.has(key))) {
      failures.push(`clarification_override_not_reflected:${expectedClarification}`);
    }
    const originalTotal = query.json.pagination?.total;
    const refinedTotal = refined.json.pagination?.total;
    if (typeof originalTotal === "number" && typeof refinedTotal === "number" && originalTotal === refinedTotal && sameTopProducts(items, refined.json.items ?? [])) {
      failures.push(`clarification_override_did_not_change_results:${expectedClarification}`);
    }
  }

  if (query.json.queryId && items[0]) {
    const evidence = await getJson<{ evidence?: unknown[]; error?: { code?: string } }>(
      `/api/ai/amazon2023/query/${encodeURIComponent(query.json.queryId)}/items/${encodeURIComponent(items[0].id)}/evidence`,
    );
    if (!evidence.response.ok) failures.push(`evidence_http_${evidence.response.status}:${evidence.json.error?.code ?? "unknown"}`);
    if (!Array.isArray(evidence.json.evidence)) failures.push("evidence_missing_array");
  }

  if (query.json.queryId && items.length >= 2) {
    const compare = await postJson<{ comparison?: { rows?: { productId: string }[] }; error?: { code?: string } }>("/api/ai/amazon2023/compare", {
      queryId: query.json.queryId,
      selectedProductIds: items.slice(0, 2).map((item) => item.id),
      activeDimensions: query.json.comparisonDimensions?.filter((dimension) => dimension.active).map((dimension) => dimension.key).slice(0, 5) ?? [],
    });
    if (!compare.response.ok) failures.push(`compare_http_${compare.response.status}:${compare.json.error?.code ?? "unknown"}`);
    if ((compare.json.comparison?.rows?.length ?? 0) < 2) failures.push("compare_missing_rows");
  }

  await sleep(50);

  return {
    id: testCase.id,
    query: testCase.query,
    itemCount: items.length,
    total: query.json.pagination?.total ?? null,
    responseMs: Date.now() - startedAt,
    failures: [...new Set(failures)],
  };
}

async function main() {
  const inProcessServer = await startInProcessServer();
  const manifest = await getJson<{ counts?: { products?: number; reviews?: number }; error?: { code?: string } }>("/api/demos/amazon2023/manifest");
  if (!manifest.response.ok) {
    console.log(JSON.stringify({ apiBaseUrl, manifestStatus: manifest.response.status, error: manifest.json.error }, null, 2));
    throw new Error("Amazon 2023 dataset is not imported or backend is unavailable.");
  }

  const results: CaseResult[] = [];
  for (const testCase of CASES) {
    const result = await runCase(testCase);
    results.push(result);
    console.log(`[${result.failures.length ? "FAIL" : "PASS"}] ${result.id} ${result.itemCount} items ${result.responseMs}ms`);
  }

  const failures = results.filter((result) => result.failures.length > 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    manifest: manifest.json,
    testedCases: results.length,
    passCount: results.length - failures.length,
    failureCount: failures.length,
    sampleFailures: failures,
  };

  const reportDir = resolve("reports");
  await mkdir(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, "amazon2023-ai-flow-test-latest.json");
  const mdPath = resolve(reportDir, "amazon2023-ai-flow-test-latest.md");
  await writeFile(jsonPath, JSON.stringify({ summary, cases: CASES, results }, null, 2));
  await writeFile(
    mdPath,
    [
      "# Amazon 2023 AI Flow Test",
      "",
      `- Generated at: ${summary.generatedAt}`,
      `- API base URL: ${summary.apiBaseUrl}`,
      `- Products/reviews: ${summary.manifest.counts?.products ?? "n/a"}/${summary.manifest.counts?.reviews ?? "n/a"}`,
      `- Pass/fail: ${summary.passCount}/${summary.failureCount}`,
      "",
      "## Failures",
      "",
      failures.length ? failures.map((result) => `- ${result.id}: ${result.failures.join(", ")}`).join("\n") : "- none",
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify({ summary, reportFiles: { json: jsonPath, markdown: mdPath } }, null, 2));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
  if (inProcessServer) {
    await new Promise<void>((resolveClose) => inProcessServer.close(() => resolveClose()));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
