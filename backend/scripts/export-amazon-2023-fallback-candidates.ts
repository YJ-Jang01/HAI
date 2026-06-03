import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import pg from "pg";

const { Pool } = pg;

type Args = {
  datasetSlug: string;
  limit: number;
  out: string;
};

type Candidate = {
  productId: string;
  productSlug: string;
  sourceProductId: string;
  title: string;
  imageId: string;
  sourceUrl: string;
  variant: string;
  httpStatus: number | null;
  checkedAt: string | null;
  suggestedStorageBucket: string;
  suggestedStoragePath: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    datasetSlug: "amazon-fashion-2023",
    limit: 5000,
    out: resolve("reports", "amazon2023-fallback-candidates.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;
    if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--limit") args.limit = Number(value);
    else if (key === "--out") args.out = value;
    else throw new Error(`Unknown argument: ${key}`);
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error("--limit must be a positive integer.");
  }
  return args;
}

function storagePath(datasetSlug: string, productSlug: string, imageId: string) {
  return `${datasetSlug}/${productSlug}/${imageId}.jpg`;
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

  try {
    const schemaReady = await pool.query<{ ready: string | null }>("select to_regclass('public.shopping_product_images')::text as ready");
    if (!schemaReady.rows[0]?.ready) {
      throw new Error("Amazon 2023 shopping schema is not installed.");
    }

    const result = await pool.query<Candidate>(
      `
      select
        sp.id as "productId",
        sp.slug as "productSlug",
        sp.source_product_id as "sourceProductId",
        sp.title,
        spi.id as "imageId",
        spi.source_url as "sourceUrl",
        spi.variant,
        spi.http_status as "httpStatus",
        spi.checked_at::text as "checkedAt",
        'amazon2023-fallbacks' as "suggestedStorageBucket",
        '' as "suggestedStoragePath"
      from shopping_product_images spi
      join shopping_products sp on sp.id = spi.product_id
      join shopping_datasets sd on sd.id = sp.dataset_id
      where sd.slug = $1
      and spi.status = 'broken'
      and spi.storage_public_url is null
      order by spi.checked_at nulls first, sp.slug, spi.sort_order
      limit $2
      `,
      [args.datasetSlug, args.limit],
    );

    const candidates = result.rows.map((row) => ({
      ...row,
      suggestedStoragePath: storagePath(args.datasetSlug, row.productSlug, row.imageId),
    }));
    const payload = {
      generatedAt: new Date().toISOString(),
      datasetSlug: args.datasetSlug,
      strategy: "Mirror only broken source URLs as resized fallback thumbnails. Keep original source_url in DB.",
      count: candidates.length,
      candidates,
    };

    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, JSON.stringify(payload, null, 2));
    console.log(JSON.stringify({ out: args.out, count: candidates.length }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
