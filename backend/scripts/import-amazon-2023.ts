import "dotenv/config";

import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import pg from "pg";

import { fashionCategoryPath } from "./amazon-2023-fashion-taxonomy.js";

const { Pool } = pg;
const maxStoredImagesPerProduct = Math.max(1, Number(process.env.AMAZON2023_MAX_IMAGES_PER_PRODUCT ?? 2));

type Args = {
  metadata: string;
  reviews?: string;
  datasetSlug: string;
  sourceCategory: string;
  sourceUrl?: string;
  safeTargetMb: number;
  chunkProducts: number;
  reviewsPerProduct: number;
  maxProducts?: number;
  maxReviews?: number;
  selectionPlan?: string;
  excludeCategoryPatterns: RegExp[];
  dryRun: boolean;
  reviewsOnlyExisting: boolean;
};

type ProductCandidate = {
  sourceProductId: string;
  parentAsin: string | null;
  asin: string | null;
  title: string;
  price: number | null;
  brand: string | null;
  store: string | null;
  averageRating: number | null;
  ratingNumber: number;
  mainCategory: string | null;
  categoryPath: string[];
  features: unknown[];
  description: unknown[];
  details: Record<string, unknown>;
  images: ImageCandidate[];
  raw: Record<string, unknown>;
  rawBytes: number;
};

type ImageCandidate = {
  url: string;
  variant: string;
  raw: unknown;
};

type ImportedProduct = {
  id: string;
  sourceProductId: string;
  parentAsin: string | null;
  asin: string | null;
};

type ProductImportPair = {
  candidate: ProductCandidate;
  product: ImportedProduct;
};

type ReviewInsertResult = {
  inserted: boolean;
  evidenceCount: number;
};

type CachedReview = {
  row: Record<string, unknown>;
  rawLine: string;
  rawBytes: number;
};

type ReviewEvidenceCandidate = {
  attributeKey: string;
  attributeLabel: string;
  sentiment: "positive" | "negative" | "neutral";
  evidenceText: string;
  issueType: string;
  confidence: number;
};

type SelectionPlan = {
  filePath: string;
  ids: string[];
  originalIds: number;
  rank: Map<string, number>;
  allowed: Set<string>;
  estimatedBudgetBytes: number | null;
  limitedByEstimatedBytes: boolean;
};

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  pnpm run dataset:import:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> [options]",
      "",
      "Options:",
      "  --dataset-slug <slug>             Default: amazon-fashion-2023",
      "  --source-category <name>          Default: Amazon_Fashion",
      "  --source-url <url>",
      "  --safe-target-mb <mb>             Stop before this DB size. Default: 430",
      "  --chunk-products <count>          Default: 500",
      "  --reviews-per-product <count>     Default: 5",
      "  --max-products <count>",
      "  --max-reviews <count>",
      "  --selection-plan <plan.json>      Import product IDs in a precomputed stratified order",
      "  --exclude-category-pattern <csv>  Case-insensitive regex CSV",
      "  --dry-run true|false              Default: false",
      "  --reviews-only-existing true|false Import reviews for existing dataset products without scanning metadata. Default: false",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    metadata: "",
    datasetSlug: "amazon-fashion-2023",
    sourceCategory: "Amazon_Fashion",
    safeTargetMb: 430,
    chunkProducts: 500,
    reviewsPerProduct: 5,
    excludeCategoryPatterns: [],
    dryRun: false,
    reviewsOnlyExisting: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) {
      usage();
    }
    if (value === undefined || value.startsWith("--")) {
      usage();
    }
    index += 1;

    if (key === "--metadata") args.metadata = value;
    else if (key === "--reviews") args.reviews = value;
    else if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--source-category") args.sourceCategory = value;
    else if (key === "--source-url") args.sourceUrl = value;
    else if (key === "--safe-target-mb") args.safeTargetMb = Number(value);
    else if (key === "--chunk-products") args.chunkProducts = Number(value);
    else if (key === "--reviews-per-product") args.reviewsPerProduct = Number(value);
    else if (key === "--max-products") args.maxProducts = Number(value);
    else if (key === "--max-reviews") args.maxReviews = Number(value);
    else if (key === "--selection-plan") args.selectionPlan = value;
    else if (key === "--exclude-category-pattern") {
      args.excludeCategoryPatterns = value
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean)
        .map((pattern) => new RegExp(pattern, "i"));
    } else if (key === "--dry-run") args.dryRun = value === "true";
    else if (key === "--reviews-only-existing") args.reviewsOnlyExisting = value === "true";
    else usage();
  }

  if (!args.metadata && !args.reviewsOnlyExisting) usage();
  if (args.reviewsOnlyExisting && !args.reviews) {
    throw new Error("--reviews is required when --reviews-only-existing true.");
  }
  for (const [name, value] of [
    ["safe-target-mb", args.safeTargetMb],
    ["chunk-products", args.chunkProducts],
    ["reviews-per-product", args.reviewsPerProduct],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`--${name} must be a positive number.`);
    }
  }
  return args;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
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

function jsonBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value));
}

function imageCandidates(value: unknown): ImageCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const candidates: ImageCandidate[] = [];
  const add = (url: unknown, variant: string, raw: unknown) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url) && !candidates.some((item) => item.url === url && item.variant === variant)) {
      candidates.push({ url, variant, raw });
    }
  };

  for (const item of value) {
    if (typeof item === "string") {
      add(item, "source", item);
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const image = item as Record<string, unknown>;
    for (const variant of ["large", "hi_res", "thumb", "variant", "main"]) {
      add(image[variant], variant, item);
    }
    for (const [key, nested] of Object.entries(image)) {
      if (Array.isArray(nested)) {
        nested.forEach((url, index) => add(url, `${key}_${index}`, item));
      } else {
        add(nested, key, item);
      }
    }
  }
  return candidates;
}

function productCandidate(row: Record<string, unknown>, rawLine: string): ProductCandidate | null {
  const parentAsin = safeString(row.parent_asin);
  const asin = safeString(row.asin);
  const sourceProductId = parentAsin ?? asin;
  const title = safeString(row.title);
  const details = safeObject(row.details);
  const price = safeNumber(row.price);
  const store = safeString(row.store);
  const brand = store ?? safeString(details.Brand) ?? safeString(details.BrandName);
  const images = imageCandidates(row.images);
  const path = fashionCategoryPath(row);
  const features = safeArray(row.features);
  const description = safeArray(row.description);

  if (!sourceProductId || !title || price === null || !brand || !images.length || (!features.length && !description.length && !Object.keys(details).length)) {
    return null;
  }

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
    mainCategory: path[0] ?? safeString(row.main_category),
    categoryPath: path,
    features,
    description,
    details,
    images,
    raw: row,
    rawBytes: Buffer.byteLength(rawLine),
  };
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

function isExcluded(candidate: ProductCandidate, patterns: RegExp[]) {
  if (!patterns.length) {
    return false;
  }
  const text = [candidate.mainCategory, ...candidate.categoryPath].filter(Boolean).join(" > ");
  return patterns.some((pattern) => pattern.test(text));
}

function datasetManifest(args: Args) {
  return {
    importMode: "capacity_bounded",
    metadata: args.metadata,
    reviews: args.reviews,
    selectionPlan: args.selectionPlan ?? null,
    safeTargetMb: args.safeTargetMb,
    chunkProducts: args.chunkProducts,
    reviewsPerProduct: args.reviewsPerProduct,
    maxProducts: args.maxProducts ?? null,
    maxReviews: args.maxReviews ?? null,
    excludeCategoryPatterns: args.excludeCategoryPatterns.map((pattern) => pattern.source),
    imageStrategy: "store original URLs; mirror only broken URLs as fallback thumbnails",
  };
}

function loadSelectionPlan(filePath: string, estimatedBudgetBytes?: number): SelectionPlan {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
  const parsedBudget =
    estimatedBudgetBytes ??
    (parsed.budget && typeof parsed.budget === "object" && typeof (parsed.budget as Record<string, unknown>).availableForSeedBytes === "number"
      ? ((parsed.budget as Record<string, unknown>).availableForSeedBytes as number)
      : undefined);
  const candidateEntries = Array.isArray(parsed.candidates)
    ? parsed.candidates
        .map((candidate) => {
          if (!candidate || typeof candidate !== "object") {
            return null;
          }
          const item = candidate as Record<string, unknown>;
          return {
            id: typeof item.sourceProductId === "string" ? item.sourceProductId.trim() : "",
            cumulativeEstimatedBytes: typeof item.cumulativeEstimatedBytes === "number" ? item.cumulativeEstimatedBytes : null,
          };
        })
        .filter((candidate): candidate is { id: string; cumulativeEstimatedBytes: number | null } => Boolean(candidate?.id))
    : [];
  const budgetedCandidateIds =
    parsedBudget && candidateEntries.length
      ? candidateEntries
          .filter((candidate, index) => {
            if (candidate.cumulativeEstimatedBytes === null) {
              return true;
            }
            return candidate.cumulativeEstimatedBytes <= parsedBudget || index === 0;
          })
          .map((candidate) => candidate.id)
      : candidateEntries.map((candidate) => candidate.id);
  const directIds = Array.isArray(parsed.orderedSourceProductIds) ? parsed.orderedSourceProductIds : [];
  const ids = (budgetedCandidateIds.length ? budgetedCandidateIds : directIds)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) {
    throw new Error(`Selection plan has no orderedSourceProductIds or candidate sourceProductId values: ${filePath}`);
  }
  const rank = new Map<string, number>();
  uniqueIds.forEach((id, index) => rank.set(id, index));
  return {
    filePath,
    ids: uniqueIds,
    originalIds: candidateEntries.length || directIds.length,
    rank,
    allowed: new Set(uniqueIds),
    estimatedBudgetBytes: parsedBudget ?? null,
    limitedByEstimatedBytes: Boolean(parsedBudget && uniqueIds.length < (candidateEntries.length || directIds.length)),
  };
}

function selectionRank(candidate: ProductCandidate, plan: SelectionPlan) {
  return (
    plan.rank.get(candidate.sourceProductId) ??
    (candidate.parentAsin ? plan.rank.get(candidate.parentAsin) : undefined) ??
    (candidate.asin ? plan.rank.get(candidate.asin) : undefined) ??
    null
  );
}

function pgJson(value: unknown) {
  return JSON.stringify(value);
}

async function databaseSize(pool: pg.Pool) {
  const result = await pool.query<{ bytes: string }>("select pg_database_size(current_database())::bigint as bytes");
  return Number(result.rows[0]?.bytes ?? 0);
}

async function tableSize(pool: pg.Pool, table: string) {
  const result = await pool.query<{ bytes: string }>("select pg_total_relation_size($1::regclass)::bigint as bytes", [table]);
  return Number(result.rows[0]?.bytes ?? 0);
}

async function upsertDataset(pool: pg.Pool, args: Args) {
  const result = await pool.query<{ id: string }>(
    `
    insert into shopping_datasets (
      slug, source_name, source_category, source_url, subset_strategy, db_budget_bytes,
      storage_strategy, raw_manifest, is_active, updated_at
    )
    values ($1, 'Amazon Reviews 2023', $2, $3, 'capacity_stratified_sampling', $4, 'external_url_with_selective_fallback', $5::jsonb, true, now())
    on conflict (slug) do update set
      source_category = excluded.source_category,
      source_url = excluded.source_url,
      db_budget_bytes = excluded.db_budget_bytes,
      storage_strategy = excluded.storage_strategy,
      raw_manifest = excluded.raw_manifest,
      is_active = true,
      updated_at = now()
    returning id
    `,
    [args.datasetSlug, args.sourceCategory, args.sourceUrl ?? null, Math.round(args.safeTargetMb * 1024 * 1024), pgJson(datasetManifest(args))],
  );
  return result.rows[0].id;
}

async function createImportRun(pool: pg.Pool, datasetId: string, args: Args, dbSizeBefore: number) {
  const result = await pool.query<{ id: string }>(
    `
    insert into shopping_import_runs (
      dataset_id, status, mode, phase, db_budget_bytes, db_size_before_bytes, raw_manifest
    )
    values ($1, 'started', 'import', 'metadata', $2, $3, $4::jsonb)
    returning id
    `,
    [datasetId, Math.round(args.safeTargetMb * 1024 * 1024), dbSizeBefore, pgJson(datasetManifest(args))],
  );
  return result.rows[0].id;
}

async function setImportRunStatus(pool: pg.Pool, runId: string, values: Record<string, unknown>) {
  const assignments = Object.keys(values).map((key, index) => `${key} = $${index + 2}`);
  await pool.query(`update shopping_import_runs set ${assignments.join(", ")} where id = $1`, [runId, ...Object.values(values)]);
}

async function insertSizeSample(pool: pg.Pool, runId: string, chunkNumber: number, counts: { products: number; reviews: number; rawBytes: number; notes?: string }) {
  const dbBytes = await databaseSize(pool);
  const productBytes = await tableSize(pool, "shopping_products");
  const reviewBytes = await tableSize(pool, "shopping_reviews");
  await pool.query(
    `
    insert into shopping_seed_size_samples (
      import_run_id, chunk_number, products_imported, reviews_imported, db_size_bytes,
      product_table_bytes, review_table_bytes, raw_bytes_seen, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    on conflict (import_run_id, chunk_number) do update set
      products_imported = excluded.products_imported,
      reviews_imported = excluded.reviews_imported,
      db_size_bytes = excluded.db_size_bytes,
      product_table_bytes = excluded.product_table_bytes,
      review_table_bytes = excluded.review_table_bytes,
      raw_bytes_seen = excluded.raw_bytes_seen,
      notes = excluded.notes
    `,
    [runId, chunkNumber, counts.products, counts.reviews, dbBytes, productBytes, reviewBytes, counts.rawBytes, counts.notes ?? null],
  );
  return dbBytes;
}

async function upsertCategory(pool: pg.Pool, datasetId: string, categoryCache: Map<string, string>, path: string[]) {
  let parentId: string | null = null;
  let currentPath = "";
  const categoryIds: string[] = [];
  for (let index = 0; index < path.length; index += 1) {
    const name = path[index];
    currentPath = currentPath ? `${currentPath} > ${name}` : name;
    const cached = categoryCache.get(currentPath);
    if (cached) {
      parentId = cached;
      categoryIds.push(cached);
      continue;
    }
    const slug = slugify(currentPath);
    const result = await pool.query<{ id: string }>(
      `
      insert into shopping_categories (dataset_id, parent_id, source_path, slug, name, depth, product_count, raw_category)
      values ($1, $2, $3, $4, $5, $6, 0, $7::jsonb)
      on conflict (dataset_id, source_path) do update set
        parent_id = excluded.parent_id,
        slug = excluded.slug,
        name = excluded.name,
        depth = excluded.depth,
        raw_category = excluded.raw_category
      returning id
      `,
      [datasetId, parentId, currentPath, slug, name, index, pgJson({ path: path.slice(0, index + 1) })],
    );
    parentId = result.rows[0].id;
    categoryIds.push(parentId);
    categoryCache.set(currentPath, parentId);
  }
  return categoryIds;
}

async function refreshCategoryCounts(pool: pg.Pool, datasetId: string) {
  await pool.query(
    `
    update shopping_categories as category
    set product_count = coalesce(counts.product_count, 0)
    from (
      select
        category.id,
        count(distinct path.product_id)::integer as product_count
      from shopping_categories as category
      left join shopping_product_category_paths as path
        on path.category_id = category.id
      where category.dataset_id = $1
      group by category.id
    ) as counts
    where category.id = counts.id
      and category.dataset_id = $1
    `,
    [datasetId],
  );
}

async function refreshSearchDocuments(pool: pg.Pool, datasetId: string) {
  await pool.query(
    `
    with documents as (
      select
        product.id as product_id,
        product.dataset_id,
        concat_ws(
          ' ',
          product.title,
          product.description_text,
          product.brand,
          product.store,
          product.main_category,
          product.category_path::text,
          product.features::text,
          product.description::text,
          product.details::text,
          coalesce(attributes.search_text, ''),
          coalesce(reviews.search_text, '')
        ) as search_text
      from shopping_products product
      left join (
        select
          product_id,
          string_agg(concat_ws(' ', key, label, value_text, value_number::text, value_boolean::text, value_json::text, source_path), ' ') as search_text
        from shopping_product_attributes
        group by product_id
      ) attributes on attributes.product_id = product.id
      left join (
        select
          product_id,
          string_agg(concat_ws(' ', title, body), ' ') as search_text
        from shopping_reviews
        group by product_id
      ) reviews on reviews.product_id = product.id
      where product.dataset_id = $1
    )
    insert into shopping_product_search_documents (product_id, dataset_id, search_text, search_vector, updated_at)
    select
      product_id,
      dataset_id,
      search_text,
      to_tsvector('simple', search_text),
      now()
    from documents
    on conflict (product_id) do update set
      dataset_id = excluded.dataset_id,
      search_text = excluded.search_text,
      search_vector = excluded.search_vector,
      updated_at = now()
    `,
    [datasetId],
  );

  await pool.query(
    `
    delete from shopping_product_search_documents document
    where document.dataset_id = $1
      and not exists (
        select 1
        from shopping_products product
        where product.id = document.product_id
      )
    `,
    [datasetId],
  );
}

async function purgeProductsWithoutReviews(pool: pg.Pool, datasetId: string) {
  const result = await pool.query<{ deleted: string }>(
    `
    with deleted as (
      delete from shopping_products as product
      where product.dataset_id = $1
        and not exists (
          select 1
          from shopping_reviews as review
          where review.product_id = product.id
        )
      returning 1
    )
    select count(*)::bigint as deleted from deleted
    `,
    [datasetId],
  );
  return Number(result.rows[0]?.deleted ?? 0);
}

async function insertProduct(pool: pg.Pool, datasetId: string, categoryCache: Map<string, string>, candidate: ProductCandidate) {
  const baseSlug = slugify(`${candidate.title}-${candidate.sourceProductId}`);
  const result = await pool.query<{ id: string }>(
    `
    insert into shopping_products (
      dataset_id, source_product_id, parent_asin, asin, slug, title, description_text,
      price_amount, currency_code, brand, store, average_rating, rating_number, main_category,
      category_path, features, description, details, raw_metadata, raw_metadata_bytes,
      has_image_url, image_fallback_status
    )
    values (
      $1, $2, $3, $4, $5, $6, $7, $8, 'USD', $9, $10, $11, $12, $13,
      $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19, true, 'unchecked'
    )
    on conflict (dataset_id, source_product_id) do update set
      parent_asin = excluded.parent_asin,
      asin = excluded.asin,
      title = excluded.title,
      description_text = excluded.description_text,
      price_amount = excluded.price_amount,
      brand = excluded.brand,
      store = excluded.store,
      average_rating = excluded.average_rating,
      rating_number = excluded.rating_number,
      main_category = excluded.main_category,
      category_path = excluded.category_path,
      features = excluded.features,
      description = excluded.description,
      details = excluded.details,
      raw_metadata = excluded.raw_metadata,
      raw_metadata_bytes = excluded.raw_metadata_bytes,
      has_image_url = excluded.has_image_url,
      updated_at = now()
    returning id
    `,
    [
      datasetId,
      candidate.sourceProductId,
      candidate.parentAsin,
      candidate.asin,
      baseSlug,
      candidate.title,
      candidate.description.map((value) => String(value)).join("\n\n") || null,
      candidate.price,
      candidate.brand,
      candidate.store,
      candidate.averageRating,
      candidate.ratingNumber,
      candidate.mainCategory,
      pgJson(candidate.categoryPath),
      pgJson(candidate.features),
      pgJson(candidate.description),
      pgJson(candidate.details),
      pgJson(candidate.raw),
      candidate.rawBytes,
    ],
  );
  const productId = result.rows[0].id;

  const categoryIds = candidate.categoryPath.length ? await upsertCategory(pool, datasetId, categoryCache, candidate.categoryPath) : [];
  for (let index = 0; index < categoryIds.length; index += 1) {
    await pool.query(
      `
      insert into shopping_product_category_paths (product_id, category_id, sort_order)
      values ($1, $2, $3)
      on conflict (product_id, category_id) do update set
        sort_order = excluded.sort_order
      `,
      [productId, categoryIds[index], index],
    );
  }

  for (let index = 0; index < Math.min(candidate.images.length, maxStoredImagesPerProduct); index += 1) {
    const image = candidate.images[index];
    await pool.query(
      `
      insert into shopping_product_images (product_id, source_url, variant, sort_order, is_primary, status, raw_image)
      values ($1, $2, $3, $4, $5, 'unchecked', $6::jsonb)
      on conflict (product_id, source_url, variant) do update set
        sort_order = excluded.sort_order,
        is_primary = excluded.is_primary,
        raw_image = excluded.raw_image
      `,
      [productId, image.url, image.variant, index, index === 0, pgJson(image.raw)],
    );
  }

  let attrIndex = 0;
  for (const [key, value] of Object.entries(candidate.details)) {
    const normalizedKey = slugify(key).replace(/-/g, "_");
    const textValue = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : null;
    const numberValue = typeof value === "number" ? value : null;
    const booleanValue = typeof value === "boolean" ? value : null;
    const jsonValue = typeof value === "object" && value !== null ? value : null;
    await pool.query(
      `
      insert into shopping_product_attributes (
        product_id, key, label, value_text, value_number, value_boolean, value_json, source_path, is_facet_candidate
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      on conflict (product_id, key, source_path) do update set
        label = excluded.label,
        value_text = excluded.value_text,
        value_number = excluded.value_number,
        value_boolean = excluded.value_boolean,
        value_json = excluded.value_json,
        is_facet_candidate = excluded.is_facet_candidate
      `,
      [productId, normalizedKey, key, textValue, numberValue, booleanValue, jsonValue ? pgJson(jsonValue) : null, `details.${key}`, attrIndex < 80],
    );
    attrIndex += 1;
  }

  return { id: productId, sourceProductId: candidate.sourceProductId, parentAsin: candidate.parentAsin, asin: candidate.asin };
}

async function bulkInsertProducts(pool: pg.Pool, datasetId: string, chunk: ProductCandidate[]) {
  if (!chunk.length) {
    return [];
  }

  const params: unknown[] = [];
  const rowsSql = chunk.map((candidate) => {
    const base = params.length;
    params.push(
      datasetId,
      candidate.sourceProductId,
      candidate.parentAsin,
      candidate.asin,
      slugify(`${candidate.title}-${candidate.sourceProductId}`),
      candidate.title,
      candidate.description.map((value) => String(value)).join("\n\n") || null,
      candidate.price,
      candidate.brand,
      candidate.store,
      candidate.averageRating,
      candidate.ratingNumber,
      candidate.mainCategory,
      pgJson(candidate.categoryPath),
      pgJson(candidate.features),
      pgJson(candidate.description),
      pgJson(candidate.details),
      pgJson(candidate.raw),
      candidate.rawBytes,
    );
    return `(
      $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7},
      $${base + 8}, 'USD', $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13},
      $${base + 14}::jsonb, $${base + 15}::jsonb, $${base + 16}::jsonb, $${base + 17}::jsonb,
      $${base + 18}::jsonb, $${base + 19}, true, 'unchecked'
    )`;
  });

  const result = await pool.query<ImportedProduct>(
    `
    insert into shopping_products (
      dataset_id, source_product_id, parent_asin, asin, slug, title, description_text,
      price_amount, currency_code, brand, store, average_rating, rating_number, main_category,
      category_path, features, description, details, raw_metadata, raw_metadata_bytes,
      has_image_url, image_fallback_status
    )
    values ${rowsSql.join(",\n")}
    on conflict (dataset_id, source_product_id) do update set
      parent_asin = excluded.parent_asin,
      asin = excluded.asin,
      title = excluded.title,
      description_text = excluded.description_text,
      price_amount = excluded.price_amount,
      brand = excluded.brand,
      store = excluded.store,
      average_rating = excluded.average_rating,
      rating_number = excluded.rating_number,
      main_category = excluded.main_category,
      category_path = excluded.category_path,
      features = excluded.features,
      description = excluded.description,
      details = excluded.details,
      raw_metadata = excluded.raw_metadata,
      raw_metadata_bytes = excluded.raw_metadata_bytes,
      has_image_url = excluded.has_image_url,
      updated_at = now()
    returning id, source_product_id as "sourceProductId", parent_asin as "parentAsin", asin
    `,
    params,
  );
  return result.rows;
}

function categoryEntries(chunk: ProductCandidate[]) {
  const entries = new Map<string, { sourcePath: string; parentPath: string | null; slug: string; name: string; depth: number; raw: string }>();
  for (const candidate of chunk) {
    let currentPath = "";
    for (let depth = 0; depth < candidate.categoryPath.length; depth += 1) {
      const name = candidate.categoryPath[depth];
      const parentPath = currentPath || null;
      currentPath = currentPath ? `${currentPath} > ${name}` : name;
      if (!entries.has(currentPath)) {
        entries.set(currentPath, {
          sourcePath: currentPath,
          parentPath,
          slug: slugify(currentPath),
          name,
          depth,
          raw: pgJson({ path: candidate.categoryPath.slice(0, depth + 1) }),
        });
      }
    }
  }
  return [...entries.values()].sort((a, b) => a.depth - b.depth || a.sourcePath.localeCompare(b.sourcePath));
}

async function bulkUpsertCategories(pool: pg.Pool, datasetId: string, categoryCache: Map<string, string>, chunk: ProductCandidate[]) {
  const entries = categoryEntries(chunk).filter((entry) => !categoryCache.has(entry.sourcePath));
  if (!entries.length) {
    return;
  }

  const maxDepth = Math.max(...entries.map((entry) => entry.depth));
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const depthEntries = entries.filter((entry) => entry.depth === depth && !categoryCache.has(entry.sourcePath));
    if (!depthEntries.length) {
      continue;
    }
    const params: unknown[] = [];
    const rowsSql = depthEntries.map((entry) => {
      const base = params.length;
      params.push(datasetId, entry.parentPath ? categoryCache.get(entry.parentPath) ?? null : null, entry.sourcePath, entry.slug, entry.name, entry.depth, entry.raw);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, 0, $${base + 7}::jsonb)`;
    });
    const result = await pool.query<{ id: string; sourcePath: string }>(
      `
      insert into shopping_categories (dataset_id, parent_id, source_path, slug, name, depth, product_count, raw_category)
      values ${rowsSql.join(",\n")}
      on conflict (dataset_id, source_path) do update set
        parent_id = excluded.parent_id,
        slug = excluded.slug,
        name = excluded.name,
        depth = excluded.depth,
        raw_category = excluded.raw_category
      returning id, source_path as "sourcePath"
      `,
      params,
    );
    for (const row of result.rows) {
      categoryCache.set(row.sourcePath, row.id);
    }
  }
}

async function bulkInsertCategoryPaths(pool: pg.Pool, categoryCache: Map<string, string>, pairs: ProductImportPair[]) {
  const params: unknown[] = [];
  const rowsSql: string[] = [];
  for (const pair of pairs) {
    let currentPath = "";
    for (let index = 0; index < pair.candidate.categoryPath.length; index += 1) {
      const name = pair.candidate.categoryPath[index];
      currentPath = currentPath ? `${currentPath} > ${name}` : name;
      const categoryId = categoryCache.get(currentPath);
      if (!categoryId) {
        continue;
      }
      const base = params.length;
      params.push(pair.product.id, categoryId, index);
      rowsSql.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    }
  }
  if (!rowsSql.length) {
    return;
  }
  await pool.query(
    `
    insert into shopping_product_category_paths (product_id, category_id, sort_order)
    values ${rowsSql.join(",\n")}
    on conflict (product_id, category_id) do update set
      sort_order = excluded.sort_order
    `,
    params,
  );
}

async function bulkInsertImages(pool: pg.Pool, pairs: ProductImportPair[]) {
  const imageRows: unknown[][] = [];
  for (const pair of pairs) {
    pair.candidate.images.slice(0, maxStoredImagesPerProduct).forEach((image, index) => {
      imageRows.push([pair.product.id, image.url, image.variant, index, index === 0, pgJson(image.raw)]);
    });
  }
  const chunkSize = 5000;
  for (let start = 0; start < imageRows.length; start += chunkSize) {
    const rows = imageRows.slice(start, start + chunkSize);
    const params = rows.flat();
    const rowsSql = rows.map((_, index) => {
      const base = index * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'unchecked', $${base + 6}::jsonb)`;
    });
    await pool.query(
      `
      insert into shopping_product_images (product_id, source_url, variant, sort_order, is_primary, status, raw_image)
      values ${rowsSql.join(",\n")}
      on conflict (product_id, source_url, variant) do update set
        sort_order = excluded.sort_order,
        is_primary = excluded.is_primary,
        raw_image = excluded.raw_image
      `,
      params,
    );
  }
}

async function bulkInsertAttributes(pool: pg.Pool, pairs: ProductImportPair[]) {
  const attributeRows: unknown[][] = [];
  for (const pair of pairs) {
    let attrIndex = 0;
    for (const [key, value] of Object.entries(pair.candidate.details)) {
      const normalizedKey = slugify(key).replace(/-/g, "_");
      const textValue = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : null;
      const numberValue = typeof value === "number" ? value : null;
      const booleanValue = typeof value === "boolean" ? value : null;
      const jsonValue = typeof value === "object" && value !== null ? value : null;
      attributeRows.push([
        pair.product.id,
        normalizedKey,
        key,
        textValue,
        numberValue,
        booleanValue,
        jsonValue ? pgJson(jsonValue) : null,
        `details.${key}`,
        attrIndex < 80,
      ]);
      attrIndex += 1;
    }
  }
  const chunkSize = 5000;
  for (let start = 0; start < attributeRows.length; start += chunkSize) {
    const rows = attributeRows.slice(start, start + chunkSize);
    const params = rows.flat();
    const rowsSql = rows.map((_, index) => {
      const base = index * 9;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}::jsonb, $${base + 8}, $${base + 9})`;
    });
    await pool.query(
      `
      insert into shopping_product_attributes (
        product_id, key, label, value_text, value_number, value_boolean, value_json, source_path, is_facet_candidate
      )
      values ${rowsSql.join(",\n")}
      on conflict (product_id, key, source_path) do update set
        label = excluded.label,
        value_text = excluded.value_text,
        value_number = excluded.value_number,
        value_boolean = excluded.value_boolean,
        value_json = excluded.value_json,
        is_facet_candidate = excluded.is_facet_candidate
      `,
      params,
    );
  }
}

async function importProductChunk(pool: pg.Pool, datasetId: string, categoryCache: Map<string, string>, chunk: ProductCandidate[]) {
  await pool.query("begin");
  try {
    const imported = await bulkInsertProducts(pool, datasetId, chunk);
    const bySourceProductId = new Map(imported.map((product) => [product.sourceProductId, product]));
    const pairs = chunk
      .map((candidate) => {
        const product = bySourceProductId.get(candidate.sourceProductId);
        return product ? { candidate, product } : null;
      })
      .filter((pair): pair is ProductImportPair => Boolean(pair));
    await bulkUpsertCategories(pool, datasetId, categoryCache, chunk);
    await bulkInsertCategoryPaths(pool, categoryCache, pairs);
    await bulkInsertImages(pool, pairs);
    await bulkInsertAttributes(pool, pairs);
    await pool.query("commit");
    return imported;
  } catch (error) {
    await pool.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function getDatasetId(pool: pg.Pool, datasetSlug: string) {
  const result = await pool.query<{ id: string }>("select id from shopping_datasets where slug = $1", [datasetSlug]);
  return result.rows[0]?.id ?? null;
}

async function loadExistingProducts(pool: pg.Pool, datasetId: string) {
  const result = await pool.query<ImportedProduct>(
    `
    select id, source_product_id as "sourceProductId", parent_asin as "parentAsin", asin
    from shopping_products
    where dataset_id = $1
    order by imported_at, source_product_id
    `,
    [datasetId],
  );
  return result.rows;
}

async function loadExistingSourceProductIds(pool: pg.Pool, datasetId: string) {
  const result = await pool.query<{ sourceProductId: string }>(
    `
    select source_product_id as "sourceProductId"
    from shopping_products
    where dataset_id = $1
    `,
    [datasetId],
  );
  return new Set(result.rows.map((row) => row.sourceProductId));
}

function reviewProductKey(row: Record<string, unknown>) {
  return safeString(row.parent_asin) ?? safeString(row.asin);
}

function candidateReviewKeys(candidate: ProductCandidate) {
  return [...new Set([candidate.sourceProductId, candidate.parentAsin, candidate.asin].filter((value): value is string => Boolean(value)))];
}

async function preloadReviewsForCandidates(filePath: string, candidates: ProductCandidate[], reviewsPerProduct: number) {
  const keyToCandidateIds = new Map<string, string[]>();
  for (const candidate of candidates) {
    for (const key of candidateReviewKeys(candidate)) {
      const ids = keyToCandidateIds.get(key) ?? [];
      ids.push(candidate.sourceProductId);
      keyToCandidateIds.set(key, ids);
    }
  }

  const byCandidate = new Map<string, CachedReview[]>();
  const counts = new Map<string, number>();
  let scanned = 0;
  let cached = 0;

  for await (const { row, rawLine } of readJsonlGzip(filePath)) {
    scanned += 1;
    const key = reviewProductKey(row);
    if (!key) {
      continue;
    }
    const candidateIds = keyToCandidateIds.get(key);
    if (!candidateIds?.length) {
      continue;
    }
    for (const candidateId of candidateIds) {
      const count = counts.get(candidateId) ?? 0;
      if (count >= reviewsPerProduct) {
        continue;
      }
      const reviews = byCandidate.get(candidateId) ?? [];
      reviews.push({ row, rawLine, rawBytes: Buffer.byteLength(rawLine) });
      byCandidate.set(candidateId, reviews);
      counts.set(candidateId, count + 1);
      cached += 1;
    }
  }

  return {
    byCandidate,
    scanned,
    cached,
    candidatesWithReviews: byCandidate.size,
  };
}

function reviewTimestamp(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { date: null, unix: null };
  }
  const millis = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  return {
    date: new Date(millis),
    unix: Math.floor(millis / 1000),
  };
}

const EVIDENCE_RULES: Array<{
  key: string;
  label: string;
  positive: RegExp;
  negative: RegExp;
  issueType: string;
}> = [
  {
    key: "fit",
    label: "Fit",
    positive: /\b(fits? well|true to size|good fit|perfect fit|roomy enough|맞|잘 맞|정사이즈)\b/i,
    negative: /\b(too small|too large|runs small|runs large|tight|loose|sleeves? too long|작|커|끼|헐렁|길어)\b/i,
    issueType: "fit_mismatch",
  },
  {
    key: "comfort",
    label: "Comfort",
    positive: /\b(comfortable|comfy|soft|padded|cushion|편안|편하|부드)\b/i,
    negative: /\b(uncomfortable|scratchy|itchy|stiff|hurts?|blister|불편|까슬|아파)\b/i,
    issueType: "comfort_complaint",
  },
  {
    key: "durability",
    label: "Durability",
    positive: /\b(durable|held up|sturdy|well made|quality|튼튼|견고)\b/i,
    negative: /\b(broke|tore|ripped|fell apart|cheap|scratch|wore out|찢|고장|약해)\b/i,
    issueType: "durability_risk",
  },
  {
    key: "material",
    label: "Material",
    positive: /\b(leather|wool|cotton|nylon|fabric|material|소재|가죽|울|면)\b/i,
    negative: /\b(thin fabric|cheap material|synthetic feel|pills?|see through|얇|보풀|비침)\b/i,
    issueType: "material_complaint",
  },
  {
    key: "warmth",
    label: "Warmth",
    positive: /\b(warm|winter|lined|insulated|따뜻|겨울)\b/i,
    negative: /\b(not warm|too thin|cold|얇아서 춥|따뜻하지)\b/i,
    issueType: "warmth_gap",
  },
  {
    key: "waterproof",
    label: "Water Resistance",
    positive: /\b(waterproof|water resistant|rain|weather|handled rain|방수|비)\b/i,
    negative: /\b(soaked|leaked|not waterproof|stained in rain|젖|새어|방수 안)\b/i,
    issueType: "weather_risk",
  },
  {
    key: "storage",
    label: "Storage",
    positive: /\b(pocket|pockets|fits my laptop|capacity|room|organize|수납|주머니)\b/i,
    negative: /\b(not enough room|too small for|limited space|pockets? too small|공간 부족|수납 부족)\b/i,
    issueType: "storage_gap",
  },
  {
    key: "care",
    label: "Care",
    positive: /\b(washable|easy to clean|washed well|세탁|관리 쉬)\b/i,
    negative: /\b(dry clean|hard to clean|shrunk|faded|관리 어렵|줄어|물빠짐)\b/i,
    issueType: "care_risk",
  },
];

function evidenceSnippet(title: string | null, body: string, matcher: RegExp) {
  const text = [title, body].filter(Boolean).join(" - ");
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.find((sentence) => matcher.test(sentence)) ?? text.slice(0, 360);
}

function ratingSentiment(rating: number): "positive" | "negative" | "neutral" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "neutral";
}

function extractReviewEvidence(row: Record<string, unknown>, body: string, rating: number): ReviewEvidenceCandidate[] {
  const title = safeString(row.title) ?? safeString(row.summary);
  const text = [title, body].filter(Boolean).join(" - ");
  const evidence = new Map<string, ReviewEvidenceCandidate>();

  for (const rule of EVIDENCE_RULES) {
    const negative = rule.negative.test(text);
    const positive = rule.positive.test(text);
    if (!negative && !positive) {
      continue;
    }
    const sentiment = negative ? "negative" : positive ? "positive" : ratingSentiment(rating);
    evidence.set(rule.key, {
      attributeKey: rule.key,
      attributeLabel: rule.label,
      sentiment,
      evidenceText: evidenceSnippet(title, body, negative ? rule.negative : rule.positive),
      issueType: sentiment === "negative" ? rule.issueType : "none",
      confidence: sentiment === "neutral" ? 0.55 : 0.72,
    });
  }

  if (!evidence.size) {
    const sentiment = ratingSentiment(rating);
    evidence.set("overall", {
      attributeKey: "overall",
      attributeLabel: "Overall Review Signal",
      sentiment,
      evidenceText: evidenceSnippet(title, body, /.*/),
      issueType: sentiment === "negative" ? "general_complaint" : "none",
      confidence: 0.5,
    });
  }

  return [...evidence.values()].slice(0, 6);
}

async function replaceReviewEvidence(pool: pg.Pool, productId: string, reviewId: string, evidence: ReviewEvidenceCandidate[]) {
  await pool.query("delete from shopping_review_evidence where review_id = $1 and source = 'amazon2023_rule_extractor_v1'", [reviewId]);
  for (const item of evidence) {
    await pool.query(
      `
      insert into shopping_review_evidence (
        product_id, review_id, attribute_key, attribute_label, sentiment, evidence_text, issue_type, confidence, source
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, 'amazon2023_rule_extractor_v1')
      `,
      [productId, reviewId, item.attributeKey, item.attributeLabel, item.sentiment, item.evidenceText, item.issueType, item.confidence],
    );
  }
}

async function insertReview(pool: pg.Pool, datasetId: string, productId: string, row: Record<string, unknown>, rawLine: string): Promise<ReviewInsertResult> {
  const body = safeString(row.text) ?? safeString(row.reviewText);
  const rating = safeInteger(row.rating) ?? safeInteger(row.overall);
  if (!body || rating === null) {
    return { inserted: false, evidenceCount: 0 };
  }
  const sourceKey = [
    reviewProductKey(row),
    safeString(row.user_id) ?? safeString(row.reviewerID) ?? "unknown",
    safeString(row.timestamp) ?? safeString(row.reviewTime) ?? safeString(row.unixReviewTime) ?? "unknown",
    hashText(body).slice(0, 12),
  ].join(":");
  const ts = reviewTimestamp(row.timestamp ?? row.unixReviewTime);
  const reviewerId = safeString(row.user_id) ?? safeString(row.reviewerID);
  const verified = typeof row.verified_purchase === "boolean" ? row.verified_purchase : typeof row.verified === "boolean" ? row.verified : null;
  const result = await pool.query<{ id: string }>(
    `
    insert into shopping_reviews (
      dataset_id, product_id, source_review_id, reviewer_id_hash, rating, title, body,
      helpful_vote, verified_purchase, review_timestamp, unix_review_time, raw_review, raw_review_bytes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
    on conflict (dataset_id, source_review_id) do update set
      product_id = excluded.product_id,
      rating = excluded.rating,
      title = excluded.title,
      body = excluded.body,
      helpful_vote = excluded.helpful_vote,
      verified_purchase = excluded.verified_purchase,
      review_timestamp = excluded.review_timestamp,
      unix_review_time = excluded.unix_review_time,
      raw_review = excluded.raw_review,
      raw_review_bytes = excluded.raw_review_bytes
    returning id
    `,
    [
      datasetId,
      productId,
      sourceKey,
      reviewerId ? hashText(reviewerId) : null,
      rating,
      safeString(row.title) ?? safeString(row.summary),
      body,
      safeInteger(row.helpful_vote) ?? 0,
      verified,
      ts.date,
      ts.unix,
      pgJson(row),
      Buffer.byteLength(rawLine),
    ],
  );
  const evidence = extractReviewEvidence(row, body, rating);
  await replaceReviewEvidence(pool, productId, result.rows[0].id, evidence);
  return { inserted: true, evidenceCount: evidence.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && !args.dryRun) {
    throw new Error("DATABASE_URL is required unless --dry-run true is used.");
  }

  const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      })
    : null;

  const safeTargetBytes = Math.round(args.safeTargetMb * 1024 * 1024);
  const categoryCounts = new Map<string, number>();
  const categoryCache = new Map<string, string>();
  const selected = new Map<string, ImportedProduct>();
  const reviewCounts = new Map<string, number>();
  let dbSizeBefore = 0;
  let datasetId = "dry-run";
  let importRunId = "dry-run";
  let productsScanned = 0;
  let productsEligible = 0;
  let productsImported = 0;
  let reviewsScanned = 0;
  let reviewsImported = 0;
  let evidenceImported = 0;
  let rawBytesSeen = 0;
  let chunkNumber = 0;
  let planCandidatesFound = 0;
  let planMissingCount: number | null = null;
  let selectionPlan: SelectionPlan | null = null;
  let usedPreloadedReviews = false;
  let preloadedReviewCandidates = 0;

  const registerImportedProducts = (products: ImportedProduct[]) => {
    for (const product of products) {
      selected.set(product.sourceProductId, product);
      if (product.parentAsin) selected.set(product.parentAsin, product);
      if (product.asin) selected.set(product.asin, product);
    }
  };

  try {
    if (pool && !args.dryRun) {
      dbSizeBefore = await databaseSize(pool);
      if (dbSizeBefore >= safeTargetBytes) {
        throw new Error(`Current DB size ${dbSizeBefore} is already above safe target ${safeTargetBytes}.`);
      }
      if (args.reviewsOnlyExisting) {
        const existingDatasetId = await getDatasetId(pool, args.datasetSlug);
        if (!existingDatasetId) {
          throw new Error(`Dataset not found for --reviews-only-existing: ${args.datasetSlug}`);
        }
        datasetId = existingDatasetId;
      } else {
        datasetId = await upsertDataset(pool, args);
      }
      importRunId = await createImportRun(pool, datasetId, args, dbSizeBefore);
    }
    selectionPlan = args.selectionPlan ? loadSelectionPlan(args.selectionPlan, dbSizeBefore ? Math.max(0, safeTargetBytes - dbSizeBefore) : undefined) : null;

    const importOrSelectProductChunk = async (importChunk: ProductCandidate[], label: string) => {
      if (!importChunk.length) {
        return true;
      }
      chunkNumber += 1;
      if (!args.dryRun && pool) {
        const imported = await importProductChunk(pool, datasetId, categoryCache, importChunk);
        registerImportedProducts(imported);
        productsImported += imported.length;
        const size = await insertSizeSample(pool, importRunId, chunkNumber, { products: productsImported, reviews: reviewsImported, rawBytes: rawBytesSeen });
        console.log(`${label}: products=${productsImported}, db=${Math.round(size / 1024 / 1024)}MB`);
        if (size >= safeTargetBytes) {
          console.log(`Stopping product import at safe target ${args.safeTargetMb}MB.`);
          return true;
        }
      } else {
        registerImportedProducts(
          importChunk.map((product) => ({
            id: product.sourceProductId,
            sourceProductId: product.sourceProductId,
            parentAsin: product.parentAsin,
            asin: product.asin,
          })),
        );
        productsImported += importChunk.length;
      }
      return Boolean(args.maxProducts && productsImported >= args.maxProducts);
    };

    const importPlannedChunkWithCachedReviews = async (importChunk: ProductCandidate[], cachedReviews: Map<string, CachedReview[]>, label: string) => {
      if (!importChunk.length) {
        return true;
      }
      chunkNumber += 1;

      if (!args.dryRun && pool) {
        const imported = await importProductChunk(pool, datasetId, categoryCache, importChunk);
        registerImportedProducts(imported);
        productsImported += imported.length;
        const bySourceProductId = new Map(imported.map((product) => [product.sourceProductId, product]));

        for (const candidate of importChunk) {
          const product = bySourceProductId.get(candidate.sourceProductId);
          if (!product) {
            continue;
          }
          for (const cached of cachedReviews.get(candidate.sourceProductId) ?? []) {
            const count = reviewCounts.get(product.id) ?? 0;
            if (count >= args.reviewsPerProduct || (args.maxReviews && reviewsImported >= args.maxReviews)) {
              break;
            }
            const inserted = await insertReview(pool, datasetId, product.id, cached.row, cached.rawLine);
            if (!inserted.inserted) {
              continue;
            }
            reviewCounts.set(product.id, count + 1);
            reviewsImported += 1;
            evidenceImported += inserted.evidenceCount;
            rawBytesSeen += cached.rawBytes;
          }
        }

        const size = await insertSizeSample(pool, importRunId, chunkNumber, { products: productsImported, reviews: reviewsImported, rawBytes: rawBytesSeen, notes: "planned product+review chunk" });
        console.log(`${label}: products=${productsImported}, reviews=${reviewsImported}, db=${Math.round(size / 1024 / 1024)}MB`);
        if (size >= safeTargetBytes) {
          console.log(`Stopping planned product+review import at safe target ${args.safeTargetMb}MB.`);
          return true;
        }
      } else {
        registerImportedProducts(
          importChunk.map((product) => ({
            id: product.sourceProductId,
            sourceProductId: product.sourceProductId,
            parentAsin: product.parentAsin,
            asin: product.asin,
          })),
        );
        productsImported += importChunk.length;
        for (const candidate of importChunk) {
          for (const cached of cachedReviews.get(candidate.sourceProductId) ?? []) {
            const body = safeString(cached.row.text) ?? safeString(cached.row.reviewText);
            const rating = safeInteger(cached.row.rating) ?? safeInteger(cached.row.overall);
            if (!body || rating === null) {
              continue;
            }
            reviewsImported += 1;
            evidenceImported += extractReviewEvidence(cached.row, body, rating).length;
          }
        }
      }

      return Boolean(args.maxProducts && productsImported >= args.maxProducts) || Boolean(args.maxReviews && reviewsImported >= args.maxReviews);
    };

    if (args.reviewsOnlyExisting) {
      if (!pool || args.dryRun) {
        throw new Error("--reviews-only-existing requires a live DATABASE_URL run.");
      }
      const existingProducts = await loadExistingProducts(pool, datasetId);
      registerImportedProducts(existingProducts);
      productsImported = existingProducts.length;
      productsEligible = existingProducts.length;
    } else if (selectionPlan) {
      const plannedCandidates = new Map<number, ProductCandidate>();
      for await (const { row, rawLine } of readJsonlGzip(args.metadata)) {
        productsScanned += 1;
        const candidate = productCandidate(row, rawLine);
        if (!candidate || isExcluded(candidate, args.excludeCategoryPatterns)) {
          continue;
        }
        productsEligible += 1;
        const rank = selectionRank(candidate, selectionPlan);
        if (rank === null || plannedCandidates.has(rank)) {
          continue;
        }
        plannedCandidates.set(rank, candidate);
        rawBytesSeen += candidate.rawBytes;
        const category = candidate.categoryPath.join(" > ") || "uncategorized";
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
        if (plannedCandidates.size >= selectionPlan.ids.length) {
          break;
        }
      }
      const orderedCandidates = [...plannedCandidates.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, candidate]) => candidate);
      planCandidatesFound = orderedCandidates.length;
      planMissingCount = selectionPlan.ids.length - planCandidatesFound;
      let importableCandidates = orderedCandidates;
      if (pool && !args.dryRun) {
        const existingSourceProductIds = await loadExistingSourceProductIds(pool, datasetId);
        importableCandidates = importableCandidates.filter((candidate) => !existingSourceProductIds.has(candidate.sourceProductId));
        console.log(`Skipped existing planned products: skipped=${orderedCandidates.length - importableCandidates.length}, remaining=${importableCandidates.length}`);
      }
      let cachedReviews: Map<string, CachedReview[]> | null = null;

      if (args.reviews) {
        const preloaded = await preloadReviewsForCandidates(args.reviews, importableCandidates, args.reviewsPerProduct);
        reviewsScanned += preloaded.scanned;
        cachedReviews = preloaded.byCandidate;
        preloadedReviewCandidates = preloaded.candidatesWithReviews;
        usedPreloadedReviews = true;
        importableCandidates = importableCandidates.filter((candidate) => cachedReviews?.has(candidate.sourceProductId));
        console.log(
          `Preloaded reviews: candidates=${preloaded.candidatesWithReviews}/${importableCandidates.length}, reviews=${preloaded.cached}, scanned=${preloaded.scanned}`,
        );
      }

      for (let start = 0; start < importableCandidates.length; start += args.chunkProducts) {
        const remainingSlots = args.maxProducts ? Math.max(0, args.maxProducts - productsImported) : args.chunkProducts;
        const importChunk = importableCandidates.slice(start, start + Math.min(args.chunkProducts, remainingSlots));
        const shouldStop = cachedReviews
          ? await importPlannedChunkWithCachedReviews(importChunk, cachedReviews, `Imported planned product/review chunk ${chunkNumber + 1}`)
          : await importOrSelectProductChunk(importChunk, `Imported planned product chunk ${chunkNumber + 1}`);
        if (shouldStop) {
          break;
        }
      }
    } else {
      let chunk: ProductCandidate[] = [];
      for await (const { row, rawLine } of readJsonlGzip(args.metadata)) {
        productsScanned += 1;
        const candidate = productCandidate(row, rawLine);
        if (!candidate || isExcluded(candidate, args.excludeCategoryPatterns)) {
          continue;
        }
        productsEligible += 1;
        rawBytesSeen += candidate.rawBytes;
        const category = candidate.categoryPath.join(" > ") || "uncategorized";
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
        chunk.push(candidate);

        if (chunk.length < args.chunkProducts) {
          continue;
        }

        const remainingSlots = args.maxProducts ? Math.max(0, args.maxProducts - productsImported) : chunk.length;
        const importChunk = chunk.slice(0, remainingSlots);
        const shouldStop = await importOrSelectProductChunk(importChunk, `Imported product chunk ${chunkNumber + 1}`);
        chunk = [];
        if (shouldStop) {
          break;
        }
      }

      if (chunk.length && (!args.maxProducts || productsImported < args.maxProducts)) {
        const remaining = args.maxProducts ? chunk.slice(0, Math.max(0, args.maxProducts - productsImported)) : chunk;
        await importOrSelectProductChunk(remaining, `Imported final product chunk ${chunkNumber + 1}`);
      }
    }

    if (args.reviews && selected.size && !usedPreloadedReviews) {
      const reviewChunkSize = 1000;
      let reviewChunk = 0;
      for await (const { row, rawLine } of readJsonlGzip(args.reviews)) {
        reviewsScanned += 1;
        const key = reviewProductKey(row);
        if (!key) {
          continue;
        }
        const product = selected.get(key);
        if (!product) {
          continue;
        }
        const count = reviewCounts.get(product.id) ?? 0;
        if (count >= args.reviewsPerProduct) {
          continue;
        }

        if (!args.dryRun && pool) {
          const inserted = await insertReview(pool, datasetId, product.id, row, rawLine);
          if (!inserted.inserted) {
            continue;
          }
          evidenceImported += inserted.evidenceCount;
        } else {
          const body = safeString(row.text) ?? safeString(row.reviewText);
          const rating = safeInteger(row.rating) ?? safeInteger(row.overall);
          if (!body || rating === null) {
            continue;
          }
          evidenceImported += extractReviewEvidence(row, body, rating).length;
        }
        reviewCounts.set(product.id, count + 1);
        reviewsImported += 1;
        rawBytesSeen += Buffer.byteLength(rawLine);
        reviewChunk += 1;

        if (reviewChunk >= reviewChunkSize && pool && !args.dryRun) {
          reviewChunk = 0;
          chunkNumber += 1;
          const size = await insertSizeSample(pool, importRunId, chunkNumber, { products: productsImported, reviews: reviewsImported, rawBytes: rawBytesSeen, notes: "review chunk" });
          console.log(`Imported review chunk: reviews=${reviewsImported}, db=${Math.round(size / 1024 / 1024)}MB`);
          if (size >= safeTargetBytes) {
            console.log(`Stopping review import at safe target ${args.safeTargetMb}MB.`);
            break;
          }
        }
        if (args.maxReviews && reviewsImported >= args.maxReviews) {
          break;
        }
      }
    }

    let productsPurgedWithoutReviews = 0;
    if (pool && !args.dryRun && args.reviews) {
      productsPurgedWithoutReviews = await purgeProductsWithoutReviews(pool, datasetId);
    }

    if (pool && !args.dryRun) {
      await refreshCategoryCounts(pool, datasetId);
      await refreshSearchDocuments(pool, datasetId);
    }

    const dbSizeAfter = pool && !args.dryRun ? await databaseSize(pool) : null;
    if (pool && !args.dryRun) {
      await setImportRunStatus(pool, importRunId, {
        status: "finished",
        phase: "complete",
        db_size_after_bytes: dbSizeAfter,
        products_scanned: productsScanned,
        products_imported: productsImported,
        reviews_scanned: reviewsScanned,
        reviews_imported: reviewsImported,
        finished_at: new Date(),
      });
    }

    console.log(
      JSON.stringify(
        {
          dryRun: args.dryRun,
          datasetSlug: args.datasetSlug,
          productsScanned,
          productsEligible,
          productsImported,
          reviewsScanned,
          reviewsImported,
          evidenceImported,
          productsPurgedWithoutReviews,
          usedPreloadedReviews,
          preloadedReviewCandidates,
          selectionPlan: selectionPlan
            ? {
              filePath: selectionPlan.filePath,
              originalPlannedProductIds: selectionPlan.originalIds,
              activePlannedProductIds: selectionPlan.ids.length,
              estimatedBudgetBytes: selectionPlan.estimatedBudgetBytes,
              limitedByEstimatedBytes: selectionPlan.limitedByEstimatedBytes,
              candidatesFound: planCandidatesFound,
              missingFromMetadata: planMissingCount,
            }
            : null,
          dbSizeBefore,
          dbSizeAfter,
          topCategories: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([category, count]) => ({ category, count })),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (pool && !args.dryRun && importRunId !== "dry-run") {
      await setImportRunStatus(pool, importRunId, {
        status: "failed",
        phase: "error",
        finished_at: new Date(),
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    await pool?.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
