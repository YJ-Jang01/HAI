import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

type Args = {
  datasetSlug?: string;
  limit: number;
  concurrency: number;
  timeoutMs: number;
  primaryOnly: boolean;
  dryRun: boolean;
};

type ImageRow = {
  id: string;
  product_id: string;
  source_url: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    limit: 1000,
    concurrency: 8,
    timeoutMs: 5000,
    primaryOnly: false,
    dryRun: false,
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
    else if (key === "--concurrency") args.concurrency = Number(value);
    else if (key === "--timeout-ms") args.timeoutMs = Number(value);
    else if (key === "--primary-only") args.primaryOnly = value === "true";
    else if (key === "--dry-run") args.dryRun = value === "true";
    else throw new Error(`Unknown argument: ${key}`);
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0) throw new Error("--limit must be a positive integer.");
  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) throw new Error("--concurrency must be a positive integer.");
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) throw new Error("--timeout-ms must be a positive integer.");
  return args;
}

async function checkUrl(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow", headers: { range: "bytes=0-1" } });
    }
    const contentType = response.headers.get("content-type") ?? "";
    const ok = response.ok && (contentType.startsWith("image/") || contentType === "" || response.status === 206);
    return {
      status: ok ? "ok" : "broken",
      httpStatus: response.status,
      reason: ok ? null : `Unexpected response: ${response.status} ${contentType}`,
    };
  } catch (error) {
    return {
      status: "broken",
      httpStatus: null,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function loadImages(pool: pg.Pool, args: Args) {
  const params: unknown[] = [args.limit];
  const datasetFilter = args.datasetSlug
    ? `and exists (
        select 1
        from shopping_products sp
        join shopping_datasets sd on sd.id = sp.dataset_id
        where sp.id = spi.product_id and sd.slug = $2
      )`
    : "";
  if (args.datasetSlug) params.push(args.datasetSlug);
  const result = await pool.query<ImageRow>(
    `
    select spi.id, spi.product_id, spi.source_url
    from shopping_product_images spi
    where spi.status in ('unchecked', 'failed', 'broken')
    ${args.primaryOnly ? "and spi.is_primary = true" : ""}
    ${datasetFilter}
    order by spi.created_at, spi.id
    limit $1
    `,
    params,
  );
  return result.rows;
}

async function updateImage(pool: pg.Pool, image: ImageRow, result: Awaited<ReturnType<typeof checkUrl>>) {
  await pool.query(
    `
    update shopping_product_images
    set status = $2, http_status = $3, checked_at = now()
    where id = $1
    `,
    [image.id, result.status, result.httpStatus],
  );
}

async function refreshProductFallbackStatus(pool: pg.Pool, productIds: string[]) {
  if (!productIds.length) {
    return;
  }
  await pool.query(
    `
    with image_state as (
      select
        product_id,
        bool_or(status = 'ok') as has_source_ok,
        bool_or(status = 'mirrored' or storage_public_url is not null) as has_fallback,
        bool_or(status = 'broken') as has_broken_image
      from shopping_product_images
      where product_id = any($1::uuid[])
      group by product_id
    )
    update shopping_products sp
    set image_fallback_status = case
      when image_state.has_source_ok then 'source_ok'
      when image_state.has_fallback then 'fallback_stored'
      when image_state.has_broken_image then 'fallback_candidate'
      else 'unchecked'
    end,
    updated_at = now()
    from image_state
    where sp.id = image_state.product_id
    `,
    [productIds],
  );
}

async function worker(pool: pg.Pool, args: Args, queue: ImageRow[], summary: Record<string, number>, productsToRefresh: Set<string>) {
  while (queue.length) {
    const image = queue.shift();
    if (!image) {
      return;
    }
    const result = await checkUrl(image.source_url, args.timeoutMs);
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    productsToRefresh.add(image.product_id);
    if (!args.dryRun) {
      await updateImage(pool, image, result);
    }
    if (result.status !== "ok") {
      console.warn(`Broken image candidate ${image.id}: ${result.httpStatus ?? "no-status"} ${result.reason ?? ""}`);
    }
  }
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
    const images = await loadImages(pool, args);
    const queue = [...images];
    const summary: Record<string, number> = { checked: images.length };
    const productsToRefresh = new Set<string>();
    const workers = Array.from({ length: Math.min(args.concurrency, images.length) }, () => worker(pool, args, queue, summary, productsToRefresh));
    await Promise.all(workers);
    if (!args.dryRun) {
      await refreshProductFallbackStatus(pool, [...productsToRefresh]);
    }
    console.log(JSON.stringify({ dryRun: args.dryRun, ...summary, productsRefreshed: productsToRefresh.size }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
