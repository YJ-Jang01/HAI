import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type CriteriaValue = string | number | boolean | null;
type CriteriaOverride = { key: string; value: CriteriaValue };
type ClarificationOption = {
  value: CriteriaValue;
  label?: string;
  estimatedCount?: number;
  criteriaOverrides?: CriteriaOverride[];
};
type Clarification = {
  key: string;
  label?: string;
  question?: string;
  options?: ClarificationOption[];
};
type AiItem = {
  id: string;
  name?: string;
  title?: string;
  price?: number | { amount?: number | null } | null;
};
type AiResponse = {
  queryId?: string;
  status?: string;
  clarifications?: Clarification[];
  items?: AiItem[];
  pagination?: { total?: number };
  error?: { code?: string; message?: string };
};
type QueryCase = {
  id: string;
  locale: "en" | "ko";
  query: string;
};
type OptionCheck = {
  clarificationKey: string;
  optionLabel: string;
  estimatedCount: number | null;
  refinedTotal: number | null;
  overrideKeys: string[];
  failures: string[];
};
type CaseResult = {
  id: string;
  locale: "en" | "ko";
  query: string;
  queryId: string | null;
  total: number | null;
  clarificationCount: number;
  optionCheckCount: number;
  responseMs: number;
  optionChecks: OptionCheck[];
  failures: string[];
  warnings: string[];
};

let apiBaseUrl = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON2023_CLARIFICATION_QA_TIMEOUT_MS ?? 35_000));
const CASE_DELAY_MS = Math.max(0, Number(process.env.AMAZON2023_CLARIFICATION_QA_DELAY_MS ?? 120));

const ENGLISH_CASES: QueryCase[] = [
  { id: "en-01-boys-pants-price-regression", locale: "en", query: "boy pants sporty less than 100$" },
  { id: "en-02-pretty-boys-pants", locale: "en", query: "pretty boys sporty pants less than $100" },
  { id: "en-03-comfortable-boys-pants", locale: "en", query: "comfortable boys sporty pants under $100" },
  { id: "en-04-warm-boys-winter-pants", locale: "en", query: "warm boys winter pants under $80" },
  { id: "en-05-men-party-shirt", locale: "en", query: "men party shirt under $120" },
  { id: "en-06-stylish-men-party-shirt", locale: "en", query: "stylish men party shirt below $120" },
  { id: "en-07-pretty-summer-short-sleeve-shirt", locale: "en", query: "pretty summer short sleeve shirt below $60" },
  { id: "en-08-comfortable-commute-shoes", locale: "en", query: "comfortable commute shoes under 120 dollars for women" },
  { id: "en-09-pretty-interview-shoes", locale: "en", query: "pretty women's interview shoes below $150" },
  { id: "en-10-comfortable-school-backpack", locale: "en", query: "comfortable school backpack under $70" },
  { id: "en-11-stylish-travel-tote", locale: "en", query: "stylish travel tote under $100 for women" },
  { id: "en-12-warm-winter-coat", locale: "en", query: "warm winter coat under $140 for women" },
  { id: "en-13-pretty-girls-summer-dress", locale: "en", query: "pretty girls summer dress under $80" },
  { id: "en-14-comfortable-girls-leggings", locale: "en", query: "comfortable girls sporty leggings under $50" },
  { id: "en-15-warm-baby-pajamas", locale: "en", query: "warm baby winter pajamas under $50" },
  { id: "en-16-pretty-office-blouse", locale: "en", query: "pretty women office blouse under $90" },
  { id: "en-17-comfortable-running-shoes", locale: "en", query: "comfortable men running shoes under $110" },
  { id: "en-18-pretty-sandals", locale: "en", query: "pretty women sandals under $70" },
  { id: "en-19-nice-looking-belt", locale: "en", query: "nice looking men's belt under $60" },
  { id: "en-20-comfortable-unisex-hoodie", locale: "en", query: "comfortable unisex daily hoodie below $75" },
  { id: "en-21-stylish-lightweight-jacket", locale: "en", query: "stylish men's lightweight jacket under $150" },
  { id: "en-22-pretty-girls-formal-shoes", locale: "en", query: "pretty girls formal shoes less than $90" },
  { id: "en-23-comfortable-womens-flats", locale: "en", query: "comfortable women's flats under $85" },
  { id: "en-24-party-pants-men", locale: "en", query: "party pants for men under $100" },
  { id: "en-25-pretty-school-skirt", locale: "en", query: "pretty school skirt for girls under $45" },
  { id: "en-26-warm-boys-sweatpants", locale: "en", query: "warm boys sweatpants under $55" },
  { id: "en-27-stylish-black-dress", locale: "en", query: "stylish women's black dress under $120" },
  { id: "en-28-comfortable-hiking-boots", locale: "en", query: "comfortable hiking boots for men under $160" },
  { id: "en-29-pretty-soft-scarf", locale: "en", query: "pretty unisex soft scarf under $35" },
  { id: "en-30-between-price-party-shirt", locale: "en", query: "stylish party shirt for men between $50 and $100" },
];

const KOREAN_CASES: QueryCase[] = [
  { id: "ko-01-boys-pants-price-regression", locale: "ko", query: "남아 스포티 팬츠 100달러 이하" },
  { id: "ko-02-pretty-boys-pants", locale: "ko", query: "예쁜 남아 스포티 팬츠 100달러 이하" },
  { id: "ko-03-comfortable-boys-pants", locale: "ko", query: "편한 남아 스포티 팬츠 100달러 이하" },
  { id: "ko-04-warm-boys-winter-pants", locale: "ko", query: "따뜻한 남아 겨울 팬츠 80달러 이하" },
  { id: "ko-05-men-party-shirt", locale: "ko", query: "남성 파티용 셔츠 120달러 이하" },
  { id: "ko-06-pretty-men-party-shirt", locale: "ko", query: "예쁜 남성 파티용 셔츠 120달러 이하" },
  { id: "ko-07-pretty-summer-short-sleeve-shirt", locale: "ko", query: "예쁜 여름 반팔 셔츠 60달러 이하" },
  { id: "ko-08-comfortable-commute-shoes", locale: "ko", query: "편한 여성 통근 신발 120달러 이하" },
  { id: "ko-09-pretty-interview-shoes", locale: "ko", query: "예쁜 여성 면접용 구두 150달러 이하" },
  { id: "ko-10-comfortable-school-backpack", locale: "ko", query: "통학용 편한 백팩 70달러 이하" },
  { id: "ko-11-pretty-travel-tote", locale: "ko", query: "예쁜 여성 여행용 토트백 100달러 이하" },
  { id: "ko-12-warm-winter-coat", locale: "ko", query: "따뜻한 여성 겨울 코트 140달러 이하" },
  { id: "ko-13-pretty-girls-summer-dress", locale: "ko", query: "예쁜 여아 여름 원피스 80달러 이하" },
  { id: "ko-14-comfortable-girls-leggings", locale: "ko", query: "편한 여아 스포티 레깅스 50달러 이하" },
  { id: "ko-15-warm-baby-pajamas", locale: "ko", query: "따뜻한 유아 겨울 파자마 50달러 이하" },
  { id: "ko-16-pretty-office-blouse", locale: "ko", query: "예쁜 여성 오피스 블라우스 90달러 이하" },
  { id: "ko-17-comfortable-running-shoes", locale: "ko", query: "편한 남성 러닝화 110달러 이하" },
  { id: "ko-18-pretty-sandals", locale: "ko", query: "예쁜 여성 샌들 70달러 이하" },
  { id: "ko-19-nice-looking-belt", locale: "ko", query: "예쁜 남성 벨트 60달러 이하" },
  { id: "ko-20-comfortable-unisex-hoodie", locale: "ko", query: "편한 유니섹스 데일리 후드티 75달러 이하" },
  { id: "ko-21-pretty-lightweight-jacket", locale: "ko", query: "예쁜 남성 가벼운 자켓 150달러 이하" },
  { id: "ko-22-pretty-girls-formal-shoes", locale: "ko", query: "예쁜 여아 포멀 신발 90달러 이하" },
  { id: "ko-23-comfortable-womens-flats", locale: "ko", query: "편한 여성 플랫슈즈 85달러 이하" },
  { id: "ko-24-party-pants-men", locale: "ko", query: "남성 파티용 팬츠 100달러 이하" },
  { id: "ko-25-pretty-school-skirt", locale: "ko", query: "예쁜 여아 통학용 스커트 45달러 이하" },
  { id: "ko-26-warm-boys-sweatpants", locale: "ko", query: "따뜻한 남아 스웨트팬츠 55달러 이하" },
  { id: "ko-27-pretty-black-dress", locale: "ko", query: "예쁜 여성 블랙 원피스 120달러 이하" },
  { id: "ko-28-comfortable-hiking-boots", locale: "ko", query: "편한 남성 등산 부츠 160달러 이하" },
  { id: "ko-29-pretty-soft-scarf", locale: "ko", query: "예쁜 유니섹스 부드러운 스카프 35달러 이하" },
  { id: "ko-30-between-price-party-shirt", locale: "ko", query: "예쁜 남성 파티용 셔츠 50달러에서 100달러 사이" },
];

const CASES = [...ENGLISH_CASES, ...KOREAN_CASES];
const CASE_START_INDEX = Math.max(0, Number(process.env.AMAZON2023_CLARIFICATION_QA_START_INDEX ?? 0));
const CASE_END_INDEX = Math.min(CASES.length, Number(process.env.AMAZON2023_CLARIFICATION_QA_END_INDEX ?? CASES.length));
const CASE_ID_FILTER = new Set(
  (process.env.AMAZON2023_CLARIFICATION_QA_CASE_IDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

function selectedCases() {
  const ranged = CASES.slice(CASE_START_INDEX, CASE_END_INDEX);
  return CASE_ID_FILTER.size ? ranged.filter((testCase) => CASE_ID_FILTER.has(testCase.id)) : ranged;
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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

function itemPrice(item: AiItem) {
  if (typeof item.price === "number") return item.price;
  const amount = item.price?.amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function numericOverride(value: CriteriaValue) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function priceRangeFromOverrides(overrides: CriteriaOverride[]) {
  let min: number | undefined;
  let max: number | undefined;
  for (const override of overrides) {
    if (override.key === "priceMin") min = numericOverride(override.value);
    if (override.key === "priceMax") max = numericOverride(override.value);
  }
  return { min, max };
}

function optionLabel(option: ClarificationOption) {
  return option.label ?? String(option.value ?? "option");
}

function flattenOptions(clarifications: Clarification[] = []) {
  return clarifications.flatMap((clarification) =>
    (clarification.options ?? []).map((option) => ({
      clarification,
      option,
      overrides: option.criteriaOverrides ?? [],
    })),
  );
}

function overrideSignature(overrides: CriteriaOverride[]) {
  return overrides
    .map((override) => `${override.key}:${JSON.stringify(override.value)}`)
    .sort()
    .join("|");
}

function findEquivalentOption(
  options: ReturnType<typeof flattenOptions>,
  target: ReturnType<typeof flattenOptions>[number],
) {
  const targetSignature = overrideSignature(target.overrides);
  return (
    options.find((candidate) => candidate.clarification.key === target.clarification.key && overrideSignature(candidate.overrides) === targetSignature) ??
    options.find((candidate) => candidate.clarification.key === target.clarification.key && candidate.option.value === target.option.value) ??
    options.find((candidate) => candidate.clarification.key === target.clarification.key && optionLabel(candidate.option) === optionLabel(target.option))
  );
}

function validatePriceRange(caseId: string, optionLabelText: string, overrides: CriteriaOverride[], items: AiItem[], failures: string[]) {
  const { min, max } = priceRangeFromOverrides(overrides);
  if (min === undefined && max === undefined) return;
  for (const item of items) {
    const price = itemPrice(item);
    if (price === null) continue;
    if (min !== undefined && price < min - 0.001) {
      failures.push(`price_below_min:${caseId}:${optionLabelText}:${item.id}:${price}<${min}`);
    }
    if (max !== undefined && price > max + 0.001) {
      failures.push(`price_above_max:${caseId}:${optionLabelText}:${item.id}:${price}>${max}`);
    }
  }
}

async function runCase(testCase: QueryCase): Promise<CaseResult> {
  const startedAt = Date.now();
  const failures: string[] = [];
  const warnings: string[] = [];
  const payload = {
    query: testCase.query,
    visibleContext: { page: "amazon2023-clarification-count-qa" },
    session: { sessionId: "amazon2023-clarification-count-qa", locale: testCase.locale },
  };

  const query = await postJson<AiResponse>("/api/ai/amazon2023/query", payload);
  if (!query.response.ok) {
    failures.push(`query_http_${query.response.status}:${query.json.error?.code ?? "unknown"}`);
  }
  if (!query.json.queryId) failures.push("missing_query_id");

  const optionChecks: OptionCheck[] = [];
  const options = flattenOptions(query.json.clarifications ?? []);
  if (!options.length) warnings.push("no_clarification_options_returned");

  for (const { clarification, option, overrides } of options) {
    const label = optionLabel(option);
    const optionFailures: string[] = [];
    const fresh = await postJson<AiResponse>("/api/ai/amazon2023/query", payload);
    const freshOptions = flattenOptions(fresh.json.clarifications ?? []);
    const freshMatch = findEquivalentOption(freshOptions, { clarification, option, overrides });
    const effectiveOption = freshMatch?.option ?? option;
    const effectiveOverrides = freshMatch?.overrides ?? overrides;
    const estimatedCount =
      typeof effectiveOption.estimatedCount === "number" && Number.isFinite(effectiveOption.estimatedCount) ? effectiveOption.estimatedCount : null;
    if (estimatedCount === null) optionFailures.push("missing_or_invalid_estimated_count");
    if (!fresh.response.ok) optionFailures.push(`fresh_query_http_${fresh.response.status}:${fresh.json.error?.code ?? "unknown"}`);
    if (!fresh.json.queryId) optionFailures.push("fresh_query_missing_query_id");
    if (!freshMatch) optionFailures.push("fresh_option_not_found");
    if (!effectiveOverrides.length) optionFailures.push("missing_criteria_overrides");
    if (effectiveOverrides.some((override) => override.key === "priceRange")) optionFailures.push("raw_priceRange_override_not_normalized");

    let refinedTotal: number | null = null;
    if (fresh.json.queryId && effectiveOverrides.length) {
      const refined = await postJson<AiResponse>("/api/ai/amazon2023/query", {
        ...payload,
        queryId: fresh.json.queryId,
        criteriaOverrides: effectiveOverrides,
      });
      if (!refined.response.ok) {
        optionFailures.push(`refined_http_${refined.response.status}:${refined.json.error?.code ?? "unknown"}`);
      }
      refinedTotal = typeof refined.json.pagination?.total === "number" ? refined.json.pagination.total : null;
      if (estimatedCount !== null && refinedTotal !== estimatedCount) {
        optionFailures.push(`estimated_count_mismatch:expected=${estimatedCount}:actual=${String(refinedTotal)}`);
      }
      validatePriceRange(testCase.id, label, effectiveOverrides, refined.json.items ?? [], optionFailures);
    }

    optionChecks.push({
      clarificationKey: clarification.key,
      optionLabel: label,
      estimatedCount,
      refinedTotal,
      overrideKeys: effectiveOverrides.map((override) => override.key),
      failures: optionFailures,
    });
    failures.push(...optionFailures.map((failure) => `${clarification.key}:${label}:${failure}`));
  }

  await sleep(CASE_DELAY_MS);

  return {
    id: testCase.id,
    locale: testCase.locale,
    query: testCase.query,
    queryId: query.json.queryId ?? null,
    total: typeof query.json.pagination?.total === "number" ? query.json.pagination.total : null,
    clarificationCount: query.json.clarifications?.length ?? 0,
    optionCheckCount: optionChecks.length,
    responseMs: Date.now() - startedAt,
    optionChecks,
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
  };
}

function markdownReport(summary: Record<string, unknown>, results: CaseResult[]) {
  const failed = results.filter((result) => result.failures.length);
  const warned = results.filter((result) => result.warnings.length);
  return [
    "# Amazon 2023 Clarification Count QA",
    "",
    `- Generated at: ${summary.generatedAt}`,
    `- API base URL: ${summary.apiBaseUrl}`,
    `- Cases: ${summary.caseCount}`,
    `- Option checks: ${summary.optionCheckCount}`,
    `- Pass/fail: ${summary.passCount}/${summary.failureCount}`,
    `- Queries without clarification options: ${summary.noClarificationCount}`,
    "",
    "## Failures",
    "",
    failed.length ? failed.map((result) => `- ${result.id}: ${result.failures.join(", ")}`).join("\n") : "- none",
    "",
    "## Warnings",
    "",
    warned.length ? warned.map((result) => `- ${result.id}: ${result.warnings.join(", ")}`).join("\n") : "- none",
    "",
    "## Cases",
    "",
    results
      .map(
        (result) =>
          `- ${result.id} [${result.locale}]: total=${result.total ?? "n/a"}, clarifications=${result.clarificationCount}, options=${result.optionCheckCount}, failures=${result.failures.length}`,
      )
      .join("\n"),
    "",
  ].join("\n");
}

async function main() {
  const manifest = await getJson<{ counts?: { products?: number; reviews?: number }; error?: { code?: string } }>("/api/demos/amazon2023/manifest");
  if (!manifest.response.ok) {
    console.log(JSON.stringify({ apiBaseUrl, manifestStatus: manifest.response.status, error: manifest.json.error }, null, 2));
    throw new Error("Amazon 2023 dataset is not imported or backend is unavailable.");
  }

  const casesToRun = selectedCases();
  const results: CaseResult[] = [];
  for (const testCase of casesToRun) {
    const startedAt = Date.now();
    let result: CaseResult;
    try {
      result = await runCase(testCase);
    } catch (error) {
      result = {
        id: testCase.id,
        locale: testCase.locale,
        query: testCase.query,
        queryId: null,
        total: null,
        clarificationCount: 0,
        optionCheckCount: 0,
        responseMs: Date.now() - startedAt,
        optionChecks: [],
        failures: [`case_runtime_error:${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
      };
    }
    results.push(result);
    console.log(
      `[${result.failures.length ? "FAIL" : "PASS"}] ${result.id} total=${result.total ?? "n/a"} clarifications=${result.clarificationCount} options=${result.optionCheckCount} ${result.responseMs}ms`,
    );
  }

  const failures = results.filter((result) => result.failures.length);
  const optionCheckCount = results.reduce((sum, result) => sum + result.optionCheckCount, 0);
  const noClarificationCount = results.filter((result) => result.optionCheckCount === 0).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    manifest: manifest.json,
    caseCount: results.length,
    configuredCaseCount: CASES.length,
    startIndex: CASE_START_INDEX,
    endIndex: CASE_END_INDEX,
    caseIdFilter: [...CASE_ID_FILTER],
    englishCaseCount: results.filter((result) => result.locale === "en").length,
    koreanCaseCount: results.filter((result) => result.locale === "ko").length,
    optionCheckCount,
    passCount: results.length - failures.length,
    failureCount: failures.length,
    noClarificationCount,
    failedCaseIds: failures.map((result) => result.id),
  };

  const reportDir = resolve("reports");
  await mkdir(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, "amazon2023-clarification-counts-latest.json");
  const mdPath = resolve(reportDir, "amazon2023-clarification-counts-latest.md");
  await writeFile(jsonPath, JSON.stringify({ summary, cases: CASES, results }, null, 2));
  await writeFile(mdPath, markdownReport(summary, results));

  console.log(JSON.stringify({ summary, reportFiles: { json: jsonPath, markdown: mdPath } }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
