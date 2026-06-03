import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { fashionCategoryPath } from "./amazon-2023-fashion-taxonomy.js";

type Args = {
  metadata?: string;
  reviews?: string;
  out?: string;
  sampleLines: number;
  dbBudgetBytes: number;
  currentDbBytes: number;
  targetHeadroomBytes: number;
  reviewsPerProduct: number;
};

type FieldCoverage = Record<string, number>;
type NumericSummary = {
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  p50: number | null;
  p90: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    sampleLines: 50_000,
    dbBudgetBytes: 500 * 1024 * 1024,
    currentDbBytes: 68 * 1024 * 1024,
    targetHeadroomBytes: 70 * 1024 * 1024,
    reviewsPerProduct: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) {
      continue;
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;
    if (key === "--metadata") args.metadata = value;
    else if (key === "--reviews") args.reviews = value;
    else if (key === "--out") args.out = value;
    else if (key === "--sample-lines") args.sampleLines = Number(value);
    else if (key === "--db-budget-mb") args.dbBudgetBytes = Number(value) * 1024 * 1024;
    else if (key === "--current-db-mb") args.currentDbBytes = Number(value) * 1024 * 1024;
    else if (key === "--target-headroom-mb") args.targetHeadroomBytes = Number(value) * 1024 * 1024;
    else if (key === "--reviews-per-product") args.reviewsPerProduct = Number(value);
    else throw new Error(`Unknown argument: ${key}`);
  }

  if (!Number.isFinite(args.sampleLines) || args.sampleLines <= 0) {
    throw new Error("--sample-lines must be a positive number.");
  }
  if (!args.metadata && !args.reviews) {
    throw new Error("Provide --metadata and/or --reviews pointing to Amazon Reviews 2023 .jsonl.gz files.");
  }
  return args;
}

function percentile(values: number[], ratio: number) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function summarizeNumbers(values: number[]): NumericSummary {
  if (!values.length) {
    return { count: 0, min: null, max: null, average: null, p50: null, p90: null };
  }
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
  };
}

function countField(coverage: FieldCoverage, field: string, value: unknown) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string" && value.trim() === "") {
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    return;
  }
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
    return;
  }
  coverage[field] = (coverage[field] ?? 0) + 1;
}

function readPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value.replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function collectImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls: string[] = [];
  for (const image of value) {
    if (typeof image === "string") {
      urls.push(image);
      continue;
    }
    if (!image || typeof image !== "object") {
      continue;
    }
    for (const candidate of Object.values(image as Record<string, unknown>)) {
      if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        urls.push(candidate);
      } else if (Array.isArray(candidate)) {
        for (const nested of candidate) {
          if (typeof nested === "string" && /^https?:\/\//i.test(nested)) {
            urls.push(nested);
          }
        }
      }
    }
  }
  return [...new Set(urls)];
}

async function readJsonlGzip(filePath: string, limit: number, onRow: (row: Record<string, unknown>, rawLine: string) => void) {
  const stream = createReadStream(filePath).pipe(createGunzip());
  const lines = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });
  let scanned = 0;
  let invalid = 0;
  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    scanned += 1;
    try {
      onRow(JSON.parse(line) as Record<string, unknown>, line);
    } catch {
      invalid += 1;
    }
    if (scanned >= limit) {
      lines.close();
      stream.destroy();
      break;
    }
  }
  return { scanned, invalid };
}

async function profileMetadata(filePath: string, sampleLines: number) {
  const coverage: FieldCoverage = {};
  const categoryCounts = new Map<string, number>();
  const rawBytes: number[] = [];
  const imageCounts: number[] = [];
  const prices: number[] = [];
  let eligible = 0;

  const read = await readJsonlGzip(filePath, sampleLines, (row, rawLine) => {
    rawBytes.push(Buffer.byteLength(rawLine));
    for (const field of ["parent_asin", "asin", "title", "price", "store", "average_rating", "rating_number", "features", "description", "details", "images", "categories"]) {
      countField(coverage, field, row[field]);
    }
    const urls = collectImageUrls(row.images);
    imageCounts.push(urls.length);
    const price = readPrice(row.price);
    if (price !== null) {
      prices.push(price);
    }
    const category = fashionCategoryPath(row).join(" > ") || "uncategorized";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    const hasBrand = Boolean(firstString(row.store) ?? firstString((row.details as Record<string, unknown> | undefined)?.Brand));
    const hasText = Boolean(firstString(row.title)) && (Array.isArray(row.features) || Array.isArray(row.description) || row.details);
    if (firstString(row.parent_asin) && firstString(row.title) && price !== null && hasBrand && urls.length > 0 && hasText) {
      eligible += 1;
    }
  });

  return {
    file: filePath,
    scanned: read.scanned,
    invalid: read.invalid,
    eligible,
    eligibleRate: read.scanned ? eligible / read.scanned : 0,
    fieldCoverage: coverage,
    rawBytes: summarizeNumbers(rawBytes),
    imageCounts: summarizeNumbers(imageCounts),
    prices: summarizeNumbers(prices),
    topCategories: [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 50)
      .map(([category, count]) => ({ category, count })),
  };
}

async function profileReviews(filePath: string, sampleLines: number) {
  const coverage: FieldCoverage = {};
  const rawBytes: number[] = [];
  const bodyBytes: number[] = [];
  const ratings: number[] = [];
  let eligible = 0;

  const read = await readJsonlGzip(filePath, sampleLines, (row, rawLine) => {
    rawBytes.push(Buffer.byteLength(rawLine));
    for (const field of ["rating", "title", "text", "parent_asin", "asin", "user_id", "timestamp", "helpful_vote", "verified_purchase"]) {
      countField(coverage, field, row[field]);
    }
    if (typeof row.text === "string") {
      bodyBytes.push(Buffer.byteLength(row.text));
    }
    if (typeof row.rating === "number") {
      ratings.push(row.rating);
    }
    if ((firstString(row.parent_asin) ?? firstString(row.asin)) && typeof row.text === "string" && row.text.trim() && typeof row.rating === "number") {
      eligible += 1;
    }
  });

  return {
    file: filePath,
    scanned: read.scanned,
    invalid: read.invalid,
    eligible,
    eligibleRate: read.scanned ? eligible / read.scanned : 0,
    fieldCoverage: coverage,
    rawBytes: summarizeNumbers(rawBytes),
    bodyBytes: summarizeNumbers(bodyBytes),
    ratings: summarizeNumbers(ratings),
  };
}

function estimateCapacity(args: Args, metadataProfile: Awaited<ReturnType<typeof profileMetadata>> | null, reviewProfile: Awaited<ReturnType<typeof profileReviews>> | null) {
  const safeBudget = Math.max(0, args.dbBudgetBytes - args.targetHeadroomBytes);
  const availableForSeed = Math.max(0, safeBudget - args.currentDbBytes);
  const avgMetadataBytes = metadataProfile?.rawBytes.average ?? 4500;
  const avgImages = metadataProfile?.imageCounts.average ?? 2;
  const avgReviewBytes = reviewProfile?.rawBytes.average ?? 900;

  const estimatedProductBytes = Math.round(avgMetadataBytes * 1.35 + avgImages * 260 + 1600);
  const estimatedReviewBytes = Math.round(avgReviewBytes * 1.35 + 1200);
  const estimatedBytesPerProductWithReviews = estimatedProductBytes + estimatedReviewBytes * args.reviewsPerProduct;
  const estimatedProductCapacity = estimatedBytesPerProductWithReviews > 0 ? Math.floor(availableForSeed / estimatedBytesPerProductWithReviews) : 0;

  return {
    dbBudgetBytes: args.dbBudgetBytes,
    safeBudgetBytes: safeBudget,
    currentDbBytes: args.currentDbBytes,
    targetHeadroomBytes: args.targetHeadroomBytes,
    availableForSeedBytes: availableForSeed,
    reviewsPerProduct: args.reviewsPerProduct,
    estimatedProductBytes,
    estimatedReviewBytes,
    estimatedBytesPerProductWithReviews,
    estimatedProductCapacity,
    note: "Capacity is an estimate from sampled raw JSONL bytes plus normalized column/index overhead. Confirm with pilot imports and pg_database_size.",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const metadata = args.metadata ? await profileMetadata(args.metadata, args.sampleLines) : null;
  const reviews = args.reviews ? await profileReviews(args.reviews, args.sampleLines) : null;
  const output = {
    generatedAt: new Date().toISOString(),
    inputs: args,
    metadata,
    reviews,
    capacityEstimate: estimateCapacity(args, metadata, reviews),
  };

  const text = JSON.stringify(output, null, 2);
  if (args.out) {
    mkdirSync(path.dirname(args.out), { recursive: true });
    writeFileSync(args.out, text);
  }
  console.log(text);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
