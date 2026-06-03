import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

const datasetSlug = process.argv.includes("--dataset-slug")
  ? process.argv[process.argv.indexOf("--dataset-slug") + 1]
  : "amazon-fashion-2023";

if (!datasetSlug) {
  throw new Error("--dataset-slug requires a value.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

async function main() {
  const dataset = await pool.query<{ id: string }>("select id from shopping_datasets where slug = $1", [datasetSlug]);
  const datasetId = dataset.rows[0]?.id;
  if (!datasetId) {
    throw new Error(`Dataset not found: ${datasetSlug}`);
  }

  const deleted = await pool.query<{ deleted: string }>(
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

  console.log(
    JSON.stringify(
      {
        datasetSlug,
        deletedProductsWithoutReviews: Number(deleted.rows[0]?.deleted ?? 0),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
