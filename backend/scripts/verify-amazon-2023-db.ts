import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

type Args = {
  datasetSlug: string;
  maxDbMb: number;
  minProducts: number;
  minReviews: number;
  minImages: number;
  minEvidence: number;
  minSemantic: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    datasetSlug: "amazon-fashion-2023",
    maxDbMb: 480,
    minProducts: 1,
    minReviews: 1,
    minImages: 1,
    minEvidence: 1,
    minSemantic: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;
    if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--max-db-mb") args.maxDbMb = Number(value);
    else if (key === "--min-products") args.minProducts = Number(value);
    else if (key === "--min-reviews") args.minReviews = Number(value);
    else if (key === "--min-images") args.minImages = Number(value);
    else if (key === "--min-evidence") args.minEvidence = Number(value);
    else if (key === "--min-semantic") args.minSemantic = Number(value);
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  const failures: string[] = [];
  try {
    const dbSize = await client.query<{ bytes: string; pretty: string }>(
      "select pg_database_size(current_database())::bigint as bytes, pg_size_pretty(pg_database_size(current_database())) as pretty",
    );
    const maxDbBytes = args.maxDbMb * 1024 * 1024;
    if (Number(dbSize.rows[0].bytes) > maxDbBytes) {
      failures.push(`db_size_over_budget:${dbSize.rows[0].pretty}`);
    }

    const schemaReady = await client.query<{ ready: string | null }>("select to_regclass('public.shopping_datasets')::text as ready");
    if (!schemaReady.rows[0]?.ready) {
      throw new Error("Amazon 2023 shopping schema is not installed. Apply backend/drizzle/0006_amazon_reviews_2023_catalog.sql before running this verifier.");
    }
    const semanticReady = await client.query<{ ready: string | null }>("select to_regclass('public.shopping_product_semantic_attributes')::text as ready");

    const dataset = await client.query<{ id: string; slug: string; raw_manifest: unknown }>(
      "select id, slug, raw_manifest from shopping_datasets where slug = $1",
      [args.datasetSlug],
    );
    const datasetId = dataset.rows[0]?.id;
    if (!datasetId) {
      throw new Error(`Dataset not found: ${args.datasetSlug}`);
    }

    const totals = await client.query(
      `
      select
        (select count(*) from shopping_products where dataset_id = $1)::int as products,
        (
          select count(*)
          from shopping_reviews
          where dataset_id = $1
        )::int as reviews,
        (
          select count(*)
          from shopping_product_images spi
          join shopping_products sp on sp.id = spi.product_id
          where sp.dataset_id = $1
        )::int as images,
        (
          select count(*)
          from shopping_product_attributes spa
          join shopping_products sp on sp.id = spa.product_id
          where sp.dataset_id = $1
        )::int as attributes,
        (
          select count(*)
          from shopping_review_evidence sre
          join shopping_products sp on sp.id = sre.product_id
          where sp.dataset_id = $1
        )::int as evidence,
        (
          select count(*)
          from shopping_product_search_documents document
          where document.dataset_id = $1
        )::int as search_documents,
        case
          when to_regclass('public.shopping_product_semantic_attributes') is null then 0
          else (
            select count(*)
            from shopping_product_semantic_attributes semantic
            where semantic.dataset_id = $1
          )::int
        end as semantic_attributes
      `,
      [datasetId],
    );
    const total = totals.rows[0];
    if (Number(total.products) < args.minProducts) failures.push(`too_few_products:${total.products}`);
    if (Number(total.reviews) < args.minReviews) failures.push(`too_few_reviews:${total.reviews}`);
    if (Number(total.images) < args.minImages) failures.push(`too_few_images:${total.images}`);
    if (Number(total.evidence) < args.minEvidence) failures.push(`too_few_evidence:${total.evidence}`);
    if (!semanticReady.rows[0]?.ready) failures.push("semantic_schema_missing");
    if (Number(total.semantic_attributes) < args.minSemantic) failures.push(`too_few_semantic_attributes:${total.semantic_attributes}`);
    if (Number(total.search_documents) < Number(total.products)) {
      failures.push(`missing_search_documents:${Number(total.products) - Number(total.search_documents)}`);
    }

    const coverage = await client.query(
      `
      select
        count(*) filter (where title is null or btrim(title) = '')::int as missing_title,
        count(*) filter (where price_amount is null)::int as missing_price,
        count(*) filter (where coalesce(brand, store) is null or btrim(coalesce(brand, store)) = '')::int as missing_brand,
        count(*) filter (where raw_metadata is null or raw_metadata = '{}'::jsonb)::int as missing_raw_metadata,
        count(*) filter (where jsonb_array_length(category_path) = 0)::int as missing_category_path,
        count(*) filter (where not has_image_url)::int as missing_image_flag
      from shopping_products
      where dataset_id = $1
      `,
      [datasetId],
    );
    const productCoverage = coverage.rows[0];
    for (const [key, value] of Object.entries(productCoverage)) {
      if (Number(value) > 0) {
        failures.push(`${key}:${value}`);
      }
    }

    const reviewCoverage = await client.query(
      `
      select
        count(*) filter (where rating < 1 or rating > 5)::int as invalid_rating,
        count(*) filter (where body is null or btrim(body) = '')::int as missing_body,
        count(*) filter (where raw_review is null or raw_review = '{}'::jsonb)::int as missing_raw_review,
        count(*) filter (where product_id is null)::int as missing_product_link
      from shopping_reviews
      where dataset_id = $1
      `,
      [datasetId],
    );
    const reviewChecks = reviewCoverage.rows[0];
    for (const [key, value] of Object.entries(reviewChecks)) {
      if (Number(value) > 0) {
        failures.push(`${key}:${value}`);
      }
    }

    const imageCoverage = await client.query(
      `
      select
        count(*) filter (where source_url !~* '^https?://')::int as non_http_image_urls,
        count(*) filter (where is_primary)::int as primary_images,
        count(*) filter (where status = 'broken')::int as broken_images,
        count(*) filter (where storage_public_url is not null)::int as mirrored_images,
        count(distinct product_id) filter (where status = 'broken')::int as products_with_broken_images
      from shopping_product_images spi
      join shopping_products sp on sp.id = spi.product_id
      where sp.dataset_id = $1
      `,
      [datasetId],
    );
    const images = imageCoverage.rows[0];
    if (Number(images.non_http_image_urls) > 0) failures.push(`non_http_image_urls:${images.non_http_image_urls}`);
    if (Number(images.primary_images) < Number(total.products)) failures.push(`products_without_primary_image:${Number(total.products) - Number(images.primary_images)}`);

    const distribution = await client.query(
      `
      select
        min(review_count)::int as min_reviews_per_product,
        max(review_count)::int as max_reviews_per_product,
        round(avg(review_count)::numeric, 2)::float as avg_reviews_per_product,
        count(*) filter (where review_count = 0)::int as products_without_reviews
      from (
        select sp.id, count(sr.id)::int as review_count
        from shopping_products sp
        left join shopping_reviews sr on sr.product_id = sp.id
        where sp.dataset_id = $1
        group by sp.id
      ) counts
      `,
      [datasetId],
    );
    if (Number(distribution.rows[0].products_without_reviews) > 0) {
      failures.push(`products_without_reviews:${distribution.rows[0].products_without_reviews}`);
    }

    const semanticCoverage = semanticReady.rows[0]?.ready
      ? await client.query(
          `
          select
            count(distinct product_id)::int as products_with_semantics,
            count(distinct key)::int as semantic_keys,
            count(*) filter (where evidence_count > 0)::int as review_backed_rows,
            count(*) filter (where confidence < 0.35)::int as low_confidence_rows,
            round(avg(confidence)::numeric, 4)::float as avg_confidence
          from shopping_product_semantic_attributes
          where dataset_id = $1
          `,
          [datasetId],
        )
      : { rows: [{ products_with_semantics: 0, semantic_keys: 0, review_backed_rows: 0, low_confidence_rows: 0, avg_confidence: null }] };
    const semanticChecks = semanticCoverage.rows[0];
    if (Number(total.semantic_attributes) > 0 && Number(semanticChecks.products_with_semantics) < Number(total.products) * 0.85) {
      failures.push(`low_semantic_product_coverage:${semanticChecks.products_with_semantics}/${total.products}`);
    }

    const tableSizes = await client.query(
      `
      select
        relname as table_name,
        pg_total_relation_size(('public.' || quote_ident(relname))::regclass)::bigint as bytes,
        pg_size_pretty(pg_total_relation_size(('public.' || quote_ident(relname))::regclass)) as pretty
      from pg_stat_user_tables
      where schemaname = 'public'
      and relname like 'shopping_%'
      order by pg_total_relation_size(('public.' || quote_ident(relname))::regclass) desc
      `,
    );

    const output = {
      dataset: args.datasetSlug,
      dbSize: dbSize.rows[0],
      totals: total,
      productCoverage,
      reviewCoverage: reviewChecks,
      imageCoverage: images,
      reviewDistribution: distribution.rows[0],
      semanticCoverage: semanticChecks,
      tableSizes: tableSizes.rows,
      failures,
    };
    console.log(JSON.stringify(output, null, 2));

    if (failures.length > 0) {
      throw new Error(`Amazon 2023 DB verification failed: ${failures.join(", ")}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message || error.name);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
