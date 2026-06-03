import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { fashionCategoryPath } from "./amazon-2023-fashion-taxonomy.js";

type Args = {
  metadata: string;
  reviews?: string;
  out: string;
  datasetSlug: string;
  sourceCategory: string;
  randomSeed: string;
  dbBudgetBytes: number;
  currentDbBytes: number;
  targetHeadroomBytes: number;
  reviewsPerProduct: number;
  minReviewsPerProduct: number;
  oversampleFactor: number;
  categoryDepth: number;
  maxPlanProducts?: number;
  excludeCategoryPatterns: RegExp[];
};

type ReviewStats = {
  file: string;
  scanned: number;
  eligible: number;
  uniqueProducts: number;
  averageRawBytes: number;
  averageBodyBytes: number;
  counts: Map<string, number>;
};

type ProductCandidate = {
  sourceProductId: string;
  parentAsin: string | null;
  asin: string | null;
  title: string;
  price: number;
  brand: string;
  store: string | null;
  averageRating: number | null;
  ratingNumber: number;
  mainCategory: string | null;
  categoryPath: string[];
  categoryKey: string;
  imageCount: number;
  rawMetadataBytes: number;
  cappedReviewCount: number;
  estimatedBytes: number;
};

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  pnpm run dataset:plan:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --out backend/reports/amazon2023-plan.json [options]",
      "",
      "Options:",
      "  --dataset-slug <slug>             Default: amazon-fashion-2023",
      "  --source-category <name>          Default: Amazon_Fashion",
      "  --random-seed <seed>              Default: amazon2023-fashion-v1",
      "  --db-budget-mb <mb>               Default: 500",
      "  --current-db-mb <mb>              Default: 68",
      "  --target-headroom-mb <mb>         Default: 70",
      "  --reviews-per-product <count>     Default: 5",
      "  --min-reviews-per-product <count> Default: 1",
      "  --oversample-factor <number>      Default: 1.35",
      "  --category-depth <count>          Default: 3",
      "  --max-plan-products <count>",
      "  --exclude-category-pattern <csv>  Case-insensitive regex CSV",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    metadata: "",
    out: "",
    datasetSlug: "amazon-fashion-2023",
    sourceCategory: "Amazon_Fashion",
    randomSeed: "amazon2023-fashion-v1",
    dbBudgetBytes: 500 * 1024 * 1024,
    currentDbBytes: 68 * 1024 * 1024,
    targetHeadroomBytes: 70 * 1024 * 1024,
    reviewsPerProduct: 5,
    minReviewsPerProduct: 1,
    oversampleFactor: 1.35,
    categoryDepth: 3,
    excludeCategoryPatterns: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      usage();
    }
    index += 1;

    if (key === "--metadata") args.metadata = value;
    else if (key === "--reviews") args.reviews = value;
    else if (key === "--out") args.out = value;
    else if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--source-category") args.sourceCategory = value;
    else if (key === "--random-seed") args.randomSeed = value;
    else if (key === "--db-budget-mb") args.dbBudgetBytes = Math.round(Number(value) * 1024 * 1024);
    else if (key === "--current-db-mb") args.currentDbBytes = Math.round(Number(value) * 1024 * 1024);
    else if (key === "--target-headroom-mb") args.targetHeadroomBytes = Math.round(Number(value) * 1024 * 1024);
    else if (key === "--reviews-per-product") args.reviewsPerProduct = Number(value);
    else if (key === "--min-reviews-per-product") args.minReviewsPerProduct = Number(value);
    else if (key === "--oversample-factor") args.oversampleFactor = Number(value);
    else if (key === "--category-depth") args.categoryDepth = Number(value);
    else if (key === "--max-plan-products") args.maxPlanProducts = Number(value);
    else if (key === "--exclude-category-pattern") {
      args.excludeCategoryPatterns = value
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean)
        .map((pattern) => new RegExp(pattern, "i"));
    } else {
      usage();
    }
  }

  if (!args.metadata || !args.out) {
    usage();
  }
  for (const [name, value] of [
    ["db-budget-mb", args.dbBudgetBytes],
    ["current-db-mb", args.currentDbBytes],
    ["target-headroom-mb", args.targetHeadroomBytes],
    ["reviews-per-product", args.reviewsPerProduct],
    ["min-reviews-per-product", args.minReviewsPerProduct],
    ["oversample-factor", args.oversampleFactor],
    ["category-depth", args.categoryDepth],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`--${name} must be a positive number.`);
    }
  }
  return args;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value.replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function imageCount(value: unknown) {
  if (!Array.isArray(value)) {
    return 0;
  }
  const urls = new Set<string>();
  const add = (url: unknown) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
      urls.add(url);
    }
  };
  for (const item of value) {
    if (typeof item === "string") {
      add(item);
    } else if (item && typeof item === "object") {
      for (const nested of Object.values(item as Record<string, unknown>)) {
        if (Array.isArray(nested)) {
          nested.forEach(add);
        } else {
          add(nested);
        }
      }
    }
  }
  return urls.size;
}

async function* readJsonlGzip(filePath: string) {
  const input = createReadStream(filePath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) {
      continue;
    }
    try {
      yield { row: JSON.parse(line) as Record<string, unknown>, rawLine: line, lineNumber };
    } catch {
      if (lineNumber % 10_000 === 0) {
        console.warn(`Skipped invalid JSON at ${filePath}:${lineNumber}`);
      }
    }
  }
}

function reviewProductKey(row: Record<string, unknown>) {
  return safeString(row.parent_asin) ?? safeString(row.asin);
}

async function collectReviewStats(filePath: string, reviewsPerProduct: number): Promise<ReviewStats> {
  const counts = new Map<string, number>();
  let scanned = 0;
  let eligible = 0;
  let rawBytes = 0;
  let bodyBytes = 0;

  for await (const { row, rawLine } of readJsonlGzip(filePath)) {
    scanned += 1;
    const key = reviewProductKey(row);
    const body = safeString(row.text) ?? safeString(row.reviewText);
    const rating = safeInteger(row.rating) ?? safeInteger(row.overall);
    if (!key || !body || rating === null) {
      continue;
    }
    eligible += 1;
    rawBytes += Buffer.byteLength(rawLine);
    bodyBytes += Buffer.byteLength(body);
    const current = counts.get(key) ?? 0;
    if (current < reviewsPerProduct) {
      counts.set(key, current + 1);
    }
  }

  return {
    file: filePath,
    scanned,
    eligible,
    uniqueProducts: counts.size,
    averageRawBytes: eligible ? Math.round(rawBytes / eligible) : 900,
    averageBodyBytes: eligible ? Math.round(bodyBytes / eligible) : 400,
    counts,
  };
}

function categoryKey(pathValue: string[], mainCategory: string | null, categoryDepth: number) {
  const scoped = pathValue.slice(0, Math.max(1, categoryDepth)).join(" > ");
  return scoped || mainCategory || "uncategorized";
}

function hashRank(seed: string, value: string) {
  const hex = createHash("sha1").update(`${seed}:${value}`).digest("hex").slice(0, 12);
  return Number.parseInt(hex, 16);
}

function isExcluded(candidate: Pick<ProductCandidate, "mainCategory" | "categoryPath">, patterns: RegExp[]) {
  if (!patterns.length) {
    return false;
  }
  const text = [candidate.mainCategory, ...candidate.categoryPath].filter(Boolean).join(" > ");
  return patterns.some((pattern) => pattern.test(text));
}

function productReviewCount(row: Record<string, unknown>, sourceProductId: string, reviewStats: ReviewStats | null) {
  if (!reviewStats) {
    return 0;
  }
  const keys = [sourceProductId, safeString(row.parent_asin), safeString(row.asin)].filter((value): value is string => Boolean(value));
  return Math.max(0, ...keys.map((key) => reviewStats.counts.get(key) ?? 0));
}

function productCandidate(row: Record<string, unknown>, rawLine: string, args: Args, reviewStats: ReviewStats | null): ProductCandidate | null {
  const parentAsin = safeString(row.parent_asin);
  const asin = safeString(row.asin);
  const sourceProductId = parentAsin ?? asin;
  const title = safeString(row.title);
  const details = safeObject(row.details);
  const price = safeNumber(row.price);
  const store = safeString(row.store);
  const brand = store ?? safeString(details.Brand) ?? safeString(details.BrandName);
  const images = imageCount(row.images);
  const pathValue = fashionCategoryPath(row);
  const mainCategory = pathValue[0] ?? safeString(row.main_category);
  const features = safeArray(row.features);
  const description = safeArray(row.description);

  if (!sourceProductId || !title || price === null || !brand || images === 0 || (!features.length && !description.length && !Object.keys(details).length)) {
    return null;
  }

  const cappedReviewCount = productReviewCount(row, sourceProductId, reviewStats);
  if (reviewStats && cappedReviewCount < args.minReviewsPerProduct) {
    return null;
  }

  const rawMetadataBytes = Buffer.byteLength(rawLine);
  const productBytes = Math.round(rawMetadataBytes * 1.35 + images * 260 + 1600);
  const reviewBytes = Math.round((reviewStats?.averageRawBytes ?? 900) * 1.35 + 1200);
  const reviewSlots = reviewStats ? cappedReviewCount : args.reviewsPerProduct;

  return {
    sourceProductId,
    parentAsin,
    asin,
    title,
    price,
    brand,
    store,
    averageRating: safeNumber(row.average_rating),
    ratingNumber: safeInteger(row.rating_number) ?? 0,
    mainCategory,
    categoryPath: pathValue,
    categoryKey: categoryKey(pathValue, mainCategory, args.categoryDepth),
    imageCount: images,
    rawMetadataBytes,
    cappedReviewCount,
    estimatedBytes: productBytes + reviewBytes * reviewSlots,
  };
}

function budget(args: Args) {
  const safeBudgetBytes = Math.max(0, args.dbBudgetBytes - args.targetHeadroomBytes);
  const availableForSeedBytes = Math.max(0, safeBudgetBytes - args.currentDbBytes);
  const planCandidateBudgetBytes = Math.round(availableForSeedBytes * args.oversampleFactor);
  return {
    dbBudgetBytes: args.dbBudgetBytes,
    safeBudgetBytes,
    currentDbBytes: args.currentDbBytes,
    targetHeadroomBytes: args.targetHeadroomBytes,
    availableForSeedBytes,
    oversampleFactor: args.oversampleFactor,
    planCandidateBudgetBytes,
  };
}

function roundRobinCandidates(buckets: Map<string, ProductCandidate[]>, args: Args, planBudgetBytes: number) {
  const categories = [...buckets.keys()].sort((a, b) => hashRank(args.randomSeed, a) - hashRank(args.randomSeed, b));
  const offsets = new Map<string, number>();
  for (const category of categories) {
    buckets.get(category)?.sort((a, b) => hashRank(args.randomSeed, a.sourceProductId) - hashRank(args.randomSeed, b.sourceProductId));
    offsets.set(category, 0);
  }

  const ordered: Array<ProductCandidate & { rank: number; cumulativeEstimatedBytes: number }> = [];
  let cumulativeEstimatedBytes = 0;
  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;
    for (const category of categories) {
      const bucket = buckets.get(category) ?? [];
      const offset = offsets.get(category) ?? 0;
      const candidate = bucket[offset];
      if (!candidate) {
        continue;
      }
      offsets.set(category, offset + 1);
      cumulativeEstimatedBytes += candidate.estimatedBytes;
      ordered.push({ ...candidate, rank: ordered.length, cumulativeEstimatedBytes });
      madeProgress = true;

      if (cumulativeEstimatedBytes >= planBudgetBytes) {
        return ordered;
      }
      if (args.maxPlanProducts && ordered.length >= args.maxPlanProducts) {
        return ordered;
      }
    }
  }

  return ordered;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reviewStats = args.reviews ? await collectReviewStats(args.reviews, args.reviewsPerProduct) : null;
  const buckets = new Map<string, ProductCandidate[]>();
  const skipped = {
    invalidOrIncomplete: 0,
    excludedCategory: 0,
    withoutRequiredReviews: 0,
  };
  let scanned = 0;
  let eligible = 0;

  for await (const { row, rawLine } of readJsonlGzip(args.metadata)) {
    scanned += 1;
    const rawCandidate = productCandidate(row, rawLine, { ...args, minReviewsPerProduct: 0 }, reviewStats);
    if (!rawCandidate) {
      skipped.invalidOrIncomplete += 1;
      continue;
    }
    if (isExcluded(rawCandidate, args.excludeCategoryPatterns)) {
      skipped.excludedCategory += 1;
      continue;
    }
    if (reviewStats && rawCandidate.cappedReviewCount < args.minReviewsPerProduct) {
      skipped.withoutRequiredReviews += 1;
      continue;
    }
    eligible += 1;
    const bucket = buckets.get(rawCandidate.categoryKey) ?? [];
    bucket.push(rawCandidate);
    buckets.set(rawCandidate.categoryKey, bucket);
  }

  const budgetInfo = budget(args);
  if (budgetInfo.availableForSeedBytes <= 0) {
    throw new Error("No DB budget remains after current DB size and target headroom.");
  }

  const ordered = roundRobinCandidates(buckets, args, budgetInfo.planCandidateBudgetBytes);
  const selectedByCategory = new Map<string, number>();
  for (const candidate of ordered) {
    selectedByCategory.set(candidate.categoryKey, (selectedByCategory.get(candidate.categoryKey) ?? 0) + 1);
  }

  const categories = [...buckets.entries()]
    .map(([category, values]) => ({
      category,
      eligible: values.length,
      selectedInPlan: selectedByCategory.get(category) ?? 0,
    }))
    .sort((a, b) => b.selectedInPlan - a.selectedInPlan || b.eligible - a.eligible || a.category.localeCompare(b.category));

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dataset: {
      slug: args.datasetSlug,
      sourceName: "Amazon Reviews 2023",
      sourceCategory: args.sourceCategory,
    },
    selectionStrategy: {
      name: "capacity_aware_category_stratified_round_robin",
      randomSeed: args.randomSeed,
      categoryDepth: args.categoryDepth,
      reviewsPerProduct: args.reviewsPerProduct,
      minReviewsPerProduct: args.minReviewsPerProduct,
      excludeCategoryPatterns: args.excludeCategoryPatterns.map((pattern) => pattern.source),
      note: "The plan orders eligible products by deterministic category-stratified sampling. The importer still uses measured pg_database_size as the final stop condition.",
    },
    budget: budgetInfo,
    inputs: {
      metadata: args.metadata,
      reviews: args.reviews ?? null,
      out: args.out,
    },
    reviewScan: reviewStats
      ? {
          file: reviewStats.file,
          scanned: reviewStats.scanned,
          eligible: reviewStats.eligible,
          uniqueProducts: reviewStats.uniqueProducts,
          averageRawBytes: reviewStats.averageRawBytes,
          averageBodyBytes: reviewStats.averageBodyBytes,
        }
      : null,
    metadataScan: {
      file: args.metadata,
      scanned,
      eligible,
      skipped,
      categoryCount: categories.length,
      categories,
    },
    planSummary: {
      plannedProducts: ordered.length,
      estimatedBytes: ordered.at(-1)?.cumulativeEstimatedBytes ?? 0,
      estimatedMb: Math.round(((ordered.at(-1)?.cumulativeEstimatedBytes ?? 0) / 1024 / 1024) * 10) / 10,
      selectedCategoryCount: [...selectedByCategory.values()].filter((count) => count > 0).length,
      maxPlanProducts: args.maxPlanProducts ?? null,
    },
    orderedSourceProductIds: ordered.map((candidate) => candidate.sourceProductId),
    candidates: ordered.map((candidate) => ({
      rank: candidate.rank,
      sourceProductId: candidate.sourceProductId,
      parentAsin: candidate.parentAsin,
      asin: candidate.asin,
      title: candidate.title,
      brand: candidate.brand,
      price: candidate.price,
      averageRating: candidate.averageRating,
      ratingNumber: candidate.ratingNumber,
      mainCategory: candidate.mainCategory,
      categoryPath: candidate.categoryPath,
      categoryKey: candidate.categoryKey,
      imageCount: candidate.imageCount,
      cappedReviewCount: candidate.cappedReviewCount,
      rawMetadataBytes: candidate.rawMetadataBytes,
      estimatedBytes: candidate.estimatedBytes,
      cumulativeEstimatedBytes: candidate.cumulativeEstimatedBytes,
    })),
  };

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output.planSummary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
