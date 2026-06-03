import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";

type QueryCase = {
  id: string;
  locale: "ko" | "en" | "mixed";
  query: string;
  category: string;
  need: string;
  priceIntent: boolean;
  minItems: number;
  attributes: string[];
};

type ApiResult = {
  id: string;
  query: string;
  status: number;
  responseMs: number;
  total: number | null;
  returned: number;
  dimensions: string[];
  parsedCriteria: string[];
  failures: string[];
};

const CORPUS_PATH = resolve("fixtures/amazon-human/natural-language-query-corpus-v1.jsonl");
const REPORT_PATH = resolve("reports/amazon-query-corpus-v1-report.json");
let apiBaseUrl = (process.env.AMAZON_API_BASE_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const RUN_API = process.argv.includes("--api") || process.env.AMAZON_QUERY_CORPUS_TEST_API === "true";
const IN_PROCESS = process.env.AMAZON_QUERY_CORPUS_INPROCESS === "true";
const CONCURRENCY = Math.max(1, Number(process.env.AMAZON_QUERY_CORPUS_CONCURRENCY ?? 6));
const TIMEOUT_MS = Math.max(1000, Number(process.env.AMAZON_QUERY_CORPUS_TIMEOUT_MS ?? 30_000));

const ATTRIBUTE_DIMENSION_ALIASES: Record<string, string[]> = {
  colorFamily: ["colorFamily", "color"],
  priceMax: ["priceMax"],
  reviewCount: ["reviewCount"],
};

function coveredAttribute(attribute: string, dimensions: string[], parsedCriteria: string[]) {
  const candidates = ATTRIBUTE_DIMENSION_ALIASES[attribute] ?? [attribute];
  return candidates.some((candidate) => dimensions.includes(candidate) || parsedCriteria.includes(candidate));
}

async function startInProcessServer() {
  const { app } = await import("../src/app.js");
  const server = createServer(app);
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine in-process server port.");
  }
  apiBaseUrl = `http://127.0.0.1:${address.port}`;
  return server;
}

async function closeServer(server: Server | null) {
  if (!server) {
    return;
  }
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

function countBy<T extends string | number | boolean>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[String(value)] = (acc[String(value)] ?? 0) + 1;
    return acc;
  }, {});
}

function parseJsonl(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as QueryCase;
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function evaluateDiversity(cases: QueryCase[]) {
  const errors: string[] = [];
  const queryTexts = cases.map((item) => item.query.trim().toLowerCase());
  const uniqueQueries = new Set(queryTexts);
  const locales = countBy(cases.map((item) => item.locale));
  const categories = countBy(cases.map((item) => item.category));
  const needs = countBy(cases.map((item) => item.need));
  const priceIntentCount = cases.filter((item) => item.priceIntent).length;
  const attributeCounts = countBy(cases.flatMap((item) => item.attributes));
  const queryLengths = cases.map((item) => item.query.length);
  const mixedLanguageCount = cases.filter((item) => /[가-힣]/u.test(item.query) && /[A-Za-z]/.test(item.query)).length;

  if (cases.length !== 100) errors.push(`Expected 100 query cases, got ${cases.length}.`);
  if (uniqueQueries.size !== cases.length) errors.push(`Duplicate query text count: ${cases.length - uniqueQueries.size}.`);
  if ((locales.ko ?? 0) < 45) errors.push(`Korean query count must be at least 45, got ${locales.ko ?? 0}.`);
  if ((locales.en ?? 0) < 35) errors.push(`English query count must be at least 35, got ${locales.en ?? 0}.`);
  if ((locales.mixed ?? 0) < 8) errors.push(`Mixed-language query count must be at least 8, got ${locales.mixed ?? 0}.`);
  for (const category of ["bags", "outerwear", "tops", "bottoms", "dresses", "footwear", "accessories"]) {
    if ((categories[category] ?? 0) < 5) errors.push(`${category} query count must be at least 5, got ${categories[category] ?? 0}.`);
  }
  if (Object.keys(needs).length < 20) errors.push(`Need diversity must cover at least 20 distinct needs, got ${Object.keys(needs).length}.`);
  if (priceIntentCount < 35 || priceIntentCount > 70) errors.push(`Price-intent cases should be 35..70, got ${priceIntentCount}.`);
  if (Object.keys(attributeCounts).length < 22) errors.push(`Attribute diversity must cover at least 22 distinct attributes, got ${Object.keys(attributeCounts).length}.`);
  if (cases.some((item) => item.attributes.length < 3)) errors.push("Every query case must have at least 3 attribute tags.");
  if (mixedLanguageCount < 8) errors.push(`Actual mixed Hangul/Latin query count must be at least 8, got ${mixedLanguageCount}.`);
  if (Math.min(...queryLengths) < 20) errors.push("Shortest query is too short to represent natural-language search.");
  if (Math.max(...queryLengths) < 70) errors.push("Longest query is too short; corpus needs multi-constraint natural sentences.");

  return {
    passed: errors.length === 0,
    errors,
    summary: {
      total: cases.length,
      uniqueQueries: uniqueQueries.size,
      locales,
      categories,
      distinctNeeds: Object.keys(needs).length,
      needs,
      priceIntentCount,
      distinctAttributes: Object.keys(attributeCounts).length,
      topAttributes: Object.entries(attributeCounts).sort((a, b) => b[1] - a[1]).slice(0, 12),
      queryLength: {
        min: Math.min(...queryLengths),
        max: Math.max(...queryLengths),
        average: Math.round(queryLengths.reduce((sum, value) => sum + value, 0) / Math.max(1, queryLengths.length)),
      },
    },
  };
}

async function postJson(path: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, responseMs: Date.now() - startedAt, json };
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index]!);
      }
    }),
  );
  return results;
}

async function testApi(cases: QueryCase[]) {
  return mapConcurrent(cases, CONCURRENCY, async (item): Promise<ApiResult> => {
    const failures: string[] = [];
    let status = 0;
    let responseMs = 0;
    let total: number | null = null;
    let returned = 0;
    let dimensions: string[] = [];
    let parsedCriteria: string[] = [];

    try {
      const response = await postJson("/api/ai/amazon/query", {
        query: item.query,
        visibleContext: { page: "products", locale: item.locale === "ko" ? "ko" : "en" },
        session: { sessionId: "query-corpus-v1", locale: item.locale === "ko" ? "ko" : "en" },
      });
      status = response.status;
      responseMs = response.responseMs;
      const body = response.json as {
        items?: { id: string; imageUrl?: string; decisionEvidence?: { reasons?: string[]; tradeoffs?: string[] } }[];
        pagination?: { total?: number };
        comparisonDimensions?: { key: string }[];
        parsedCriteria?: { key: string; value?: unknown; displayValue?: string }[];
      };
      total = typeof body.pagination?.total === "number" ? body.pagination.total : null;
      returned = body.items?.length ?? 0;
      dimensions = body.comparisonDimensions?.map((dimension) => dimension.key) ?? [];
      parsedCriteria = body.parsedCriteria?.map((criterion) => criterion.key) ?? [];

      if (status !== 200) failures.push(`HTTP ${status}`);
      if (returned < item.minItems) failures.push(`Returned ${returned}, expected at least ${item.minItems}.`);
      if (!dimensions.includes("reviewStrengths")) failures.push("Missing reviewStrengths dimension.");
      if (!dimensions.includes("reviewRisks")) failures.push("Missing reviewRisks dimension.");
      const missingAttributes = item.attributes.filter((attribute) => !coveredAttribute(attribute, dimensions, parsedCriteria));
      if (missingAttributes.length) failures.push(`Missing expected attributes in criteria/dimensions: ${missingAttributes.join(", ")}.`);
      if (item.priceIntent && !parsedCriteria.includes("priceMax")) failures.push("Missing parsed priceMax criterion for price-intent query.");
      if ((body.items ?? []).some((product) => !product.imageUrl)) failures.push("One or more returned products are missing imageUrl.");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }

    return {
      id: item.id,
      query: item.query,
      status,
      responseMs,
      total,
      returned,
      dimensions,
      parsedCriteria,
      failures,
    };
  });
}

function isDataShortageOnlyFailure(result: ApiResult) {
  return (
    result.status === 200 &&
    result.failures.length === 1 &&
    result.failures[0]?.startsWith("Returned ") === true &&
    result.dimensions.includes("reviewStrengths") &&
    result.dimensions.includes("reviewRisks")
  );
}

async function main() {
  let server: Server | null = null;
  try {
    if (RUN_API && IN_PROCESS) {
      server = await startInProcessServer();
    }

    const cases = parseJsonl(await readFile(CORPUS_PATH, "utf-8"));
    const diversity = evaluateDiversity(cases);
    const apiResults = RUN_API ? await testApi(cases) : [];
  const apiFailures = apiResults.filter((result) => result.failures.length > 0);
  const dataShortageFailures = apiFailures.filter(isDataShortageOnlyFailure);
  const blockingFailures = apiFailures.filter((result) => !isDataShortageOnlyFailure(result));
  const responseTimes = apiResults.map((result) => result.responseMs).filter((value) => value > 0);
  const report = {
    generatedAt: new Date().toISOString(),
    corpusPath: CORPUS_PATH,
    diversity,
    api: RUN_API
      ? {
          baseUrl: apiBaseUrl,
          inProcess: IN_PROCESS,
          total: apiResults.length,
          passed: blockingFailures.length === 0,
          coveragePassed: apiFailures.length === 0,
          failures: blockingFailures,
          dataShortageCases: dataShortageFailures,
          allFailures: apiFailures,
          responseMs: {
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes),
            average: Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / Math.max(1, responseTimes.length)),
          },
        }
      : { skipped: true },
  };

  await mkdir(resolve("reports"), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  console.log(`Wrote ${REPORT_PATH}`);
  console.log(`Diversity: ${diversity.passed ? "passed" : "failed"}`);
  if (RUN_API) {
    console.log(
      `API: ${blockingFailures.length === 0 ? "passed" : `failed ${blockingFailures.length}/${apiResults.length}`}${
        dataShortageFailures.length ? `; data shortage ${dataShortageFailures.length}/${apiResults.length}` : ""
      }`,
    );
  }

  if (!diversity.passed || (RUN_API && blockingFailures.length > 0)) {
    process.exitCode = 1;
  }
  } finally {
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
