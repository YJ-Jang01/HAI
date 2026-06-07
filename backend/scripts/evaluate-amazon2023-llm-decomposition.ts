type ExpectedFilters = Record<string, string | number | boolean>;

type DecompositionCase = {
  id: string;
  query: string;
  locale: "ko" | "en";
  expectedFilters: ExpectedFilters;
  minEstimatedTotal?: number;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:8002";
const TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON_LLM_DECOMP_TIMEOUT_MS ?? 30_000));

const CASES: DecompositionCase[] = [
  {
    id: "ko-tee-open",
    query: "티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees" },
    minEstimatedTotal: 200,
  },
  {
    id: "ko-casual-tee",
    query: "캐주얼 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", style: "casual" },
    minEstimatedTotal: 24,
  },
  {
    id: "ko-daily-top",
    query: "일상용 상의",
    locale: "ko",
    expectedFilters: { category: "Tops", style: "casual" },
    minEstimatedTotal: 24,
  },
  {
    id: "ko-summer-short-sleeve-tee",
    query: "여름 반팔 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", season: "summer", sleeveLength: "short_sleeve" },
    minEstimatedTotal: 12,
  },
  {
    id: "ko-women-tee",
    query: "여성용 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", genderTarget: "women" },
    minEstimatedTotal: 12,
  },
  {
    id: "ko-men-tee",
    query: "남성용 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", genderTarget: "men" },
    minEstimatedTotal: 12,
  },
  {
    id: "ko-easy-care-tee",
    query: "세탁하기 쉬운 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", careEaseLevelMin: 4 },
    minEstimatedTotal: 8,
  },
  {
    id: "ko-cotton-comfort-tee",
    query: "편한 면 티셔츠",
    locale: "ko",
    expectedFilters: { category: "Tops", subCategory: "Tees", material: "cotton" },
    minEstimatedTotal: 8,
  },
  {
    id: "en-casual-tshirt",
    query: "casual t-shirt",
    locale: "en",
    expectedFilters: { category: "Tops", subCategory: "Tees", style: "casual" },
    minEstimatedTotal: 24,
  },
  {
    id: "en-summer-short-sleeve",
    query: "summer short sleeve t-shirt",
    locale: "en",
    expectedFilters: { category: "Tops", subCategory: "Tees", season: "summer", sleeveLength: "short_sleeve" },
    minEstimatedTotal: 12,
  },
];

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function baseUrl() {
  return (argValue("base-url") ?? process.env.AMAZON_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

function selectedCases() {
  const ids = argValue("ids");
  if (!ids) return CASES;
  const wanted = new Set(ids.split(",").map((id) => id.trim()).filter(Boolean));
  return CASES.filter((item) => wanted.has(item.id));
}

function valuesMatch(actual: unknown, expected: string | number | boolean) {
  if (typeof expected === "number") return Number(actual) === expected;
  if (typeof expected === "boolean") return Boolean(actual) === expected;
  return String(actual ?? "").toLowerCase() === expected.toLowerCase();
}

async function postInterpret(apiBaseUrl: string, item: DecompositionCase) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBaseUrl}/api/ai/amazon2023/interpret`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: item.query,
        visibleContext: { page: "products", locale: item.locale },
        session: { sessionId: "local-decomposition-eval", locale: item.locale },
      }),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const apiBaseUrl = baseUrl();
  const cases = selectedCases();
  const results = [];
  const fieldTotals = new Map<string, { passed: number; total: number }>();

  for (const item of cases) {
    const response = await postInterpret(apiBaseUrl, item);
    const decomposition = response.json?.decomposition ?? {};
    const filters = decomposition.validatedFilters ?? {};
    const failures: string[] = [];

    if (response.status !== 200) {
      failures.push(`HTTP ${response.status}`);
    }
    for (const [key, expected] of Object.entries(item.expectedFilters)) {
      const bucket = fieldTotals.get(key) ?? { passed: 0, total: 0 };
      bucket.total += 1;
      if (valuesMatch(filters[key], expected)) {
        bucket.passed += 1;
      } else {
        failures.push(`${key}: expected ${expected}, got ${String(filters[key] ?? "missing")}`);
      }
      fieldTotals.set(key, bucket);
    }
    if (item.minEstimatedTotal !== undefined && Number(response.json?.estimatedTotal ?? 0) < item.minEstimatedTotal) {
      failures.push(`estimatedTotal: expected >= ${item.minEstimatedTotal}, got ${response.json?.estimatedTotal ?? 0}`);
    }

    results.push({
      id: item.id,
      query: item.query,
      source: decomposition.source ?? "unknown",
      fallbackUsed: Boolean(decomposition.fallbackUsed),
      confidence: decomposition.confidence ?? null,
      estimatedTotal: response.json?.estimatedTotal ?? null,
      filters,
      corrections: decomposition.corrections ?? [],
      passed: failures.length === 0,
      failures,
    });
  }

  const passed = results.filter((item) => item.passed).length;
  const fieldAccuracy = Object.fromEntries(
    [...fieldTotals].map(([key, value]) => [key, value.total ? value.passed / value.total : 0]),
  );
  const summary = {
    apiBaseUrl,
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length ? passed / results.length : 0,
    sourceCounts: results.reduce<Record<string, number>>((acc, item) => {
      acc[item.source] = (acc[item.source] ?? 0) + 1;
      return acc;
    }, {}),
    fallbackCount: results.filter((item) => item.fallbackUsed).length,
    fieldAccuracy,
    results,
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Amazon 2023 LLM decomposition eval against ${apiBaseUrl}`);
  console.log(`Pass rate: ${passed}/${results.length} (${Math.round(summary.passRate * 100)}%)`);
  console.log(`Sources: ${JSON.stringify(summary.sourceCounts)}; fallback=${summary.fallbackCount}`);
  console.log(`Field accuracy: ${JSON.stringify(fieldAccuracy)}`);
  for (const result of results) {
    const mark = result.passed ? "PASS" : "FAIL";
    console.log(`${mark} ${result.id}: ${result.query} -> ${JSON.stringify(result.filters)} total=${result.estimatedTotal}`);
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
