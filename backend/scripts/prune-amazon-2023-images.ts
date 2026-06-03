import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

type Args = {
  datasetSlug: string;
  maxImagesPerProduct: number;
  apply: boolean;
  vacuum: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    datasetSlug: "amazon-fashion-2023",
    maxImagesPerProduct: 2,
    apply: false,
    vacuum: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--apply") {
      args.apply = true;
      continue;
    }
    if (key === "--no-vacuum") {
      args.vacuum = false;
      continue;
    }
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;
    if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--max-images-per-product") args.maxImagesPerProduct = Math.max(1, Number(value));
    else throw new Error(`Unknown argument: ${key}`);
  }

  return args;
}

async function relationSize(pool: pg.Pool) {
  const result = await pool.query<{ bytes: string; pretty: string }>(
    "select pg_total_relation_size('public.shopping_product_images'::regclass)::bigint as bytes, pg_size_pretty(pg_total_relation_size('public.shopping_product_images'::regclass)) as pretty",
  );
  return result.rows[0];
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
    const before = await relationSize(pool);
    const summary = await pool.query<{ total_images: string; products: string; prune_candidates: string; kept_storage_fallbacks: string }>(
      `
      with dataset as (
        select id from shopping_datasets where slug = $1
      ),
      ranked as (
        select
          spi.id,
          spi.product_id,
          spi.storage_public_url,
          row_number() over (
            partition by spi.product_id
            order by
              case when spi.is_primary then 0 else 1 end,
              case when spi.storage_public_url is not null then 0 else 1 end,
              case
                when spi.status in ('ok', 'mirrored') then 0
                when spi.status = 'unchecked' then 1
                else 2
              end,
              spi.sort_order,
              spi.created_at
          ) as keep_rank
        from shopping_product_images spi
        join shopping_products sp on sp.id = spi.product_id
        join dataset on dataset.id = sp.dataset_id
      )
      select
        count(*)::bigint as total_images,
        count(distinct product_id)::bigint as products,
        count(*) filter (where keep_rank > $2 and storage_public_url is null)::bigint as prune_candidates,
        count(*) filter (where keep_rank > $2 and storage_public_url is not null)::bigint as kept_storage_fallbacks
      from ranked
      `,
      [args.datasetSlug, args.maxImagesPerProduct],
    );

    let deleted = 0;
    if (args.apply) {
      const deletedResult = await pool.query<{ deleted: string }>(
        `
        with dataset as (
          select id from shopping_datasets where slug = $1
        ),
        ranked as (
          select
            spi.id,
            spi.storage_public_url,
            row_number() over (
              partition by spi.product_id
              order by
                case when spi.is_primary then 0 else 1 end,
                case when spi.storage_public_url is not null then 0 else 1 end,
                case
                  when spi.status in ('ok', 'mirrored') then 0
                  when spi.status = 'unchecked' then 1
                  else 2
                end,
                spi.sort_order,
                spi.created_at
            ) as keep_rank
          from shopping_product_images spi
          join shopping_products sp on sp.id = spi.product_id
          join dataset on dataset.id = sp.dataset_id
        ),
        deleted as (
          delete from shopping_product_images spi
          using ranked
          where spi.id = ranked.id
            and ranked.keep_rank > $2
            and ranked.storage_public_url is null
          returning spi.id
        )
        select count(*)::bigint as deleted from deleted
        `,
        [args.datasetSlug, args.maxImagesPerProduct],
      );
      deleted = Number(deletedResult.rows[0]?.deleted ?? 0);
      if (args.vacuum && deleted > 0) {
        await pool.query("vacuum (full, analyze) shopping_product_images");
      }
    }

    const after = await relationSize(pool);
    console.log(JSON.stringify({
      dataset: args.datasetSlug,
      maxImagesPerProduct: args.maxImagesPerProduct,
      apply: args.apply,
      vacuum: args.vacuum,
      before,
      summary: summary.rows[0],
      deleted,
      after,
    }, null, 2));
  } finally {
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
