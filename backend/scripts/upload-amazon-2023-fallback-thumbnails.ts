import "dotenv/config";

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import pg from "pg";

const { Pool } = pg;

type Args = {
  candidates: string;
  thumbnailDir?: string;
  bucket: string;
  limit: number;
  upsert: boolean;
  dryRun: boolean;
};

type CandidateInput = {
  productId: string;
  productSlug: string;
  sourceProductId: string;
  title: string;
  imageId: string;
  sourceUrl: string;
  variant: string;
  suggestedStorageBucket?: string;
  suggestedStoragePath?: string;
  localThumbnailPath?: string;
};

type CandidateFile = {
  candidates: CandidateInput[];
};

type UploadCandidate = CandidateInput & {
  storageBucket: string;
  storagePath: string;
  localPath: string;
  contentType: string;
};

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates reports/amazon2023-fallback-candidates.json --thumbnail-dir reports/amazon2023-fallback-thumbnails",
      "",
      "Options:",
      "  --bucket <name>          Default: amazon2023-fallbacks",
      "  --limit <count>          Default: 5000",
      "  --upsert true|false      Default: false",
      "  --dry-run true|false     Default: false",
      "",
      "Env:",
      "  DATABASE_URL is required unless --dry-run true.",
      "  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for uploads.",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    candidates: "",
    bucket: "amazon2023-fallbacks",
    limit: 5000,
    upsert: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      usage();
    }
    index += 1;
    if (key === "--candidates") args.candidates = value;
    else if (key === "--thumbnail-dir") args.thumbnailDir = value;
    else if (key === "--bucket") args.bucket = value;
    else if (key === "--limit") args.limit = Number(value);
    else if (key === "--upsert") args.upsert = value === "true";
    else if (key === "--dry-run") args.dryRun = value === "true";
    else usage();
  }

  if (!args.candidates) {
    usage();
  }
  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error("--limit must be a positive integer.");
  }
  return args;
}

function contentTypeFor(filePath: string) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  throw new Error(`Unsupported fallback thumbnail type for ${filePath}. Use jpg, png, or webp.`);
}

function cleanStoragePath(value: string) {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.endsWith("/")) {
    throw new Error(`Unsafe storage path: ${value}`);
  }
  return normalized;
}

function publicObjectUrl(supabaseUrl: string, bucket: string, storagePath: string) {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveThumbnailPath(candidate: CandidateInput, thumbnailDir?: string) {
  const direct = candidate.localThumbnailPath ? resolve(candidate.localThumbnailPath) : null;
  if (direct && (await fileExists(direct))) {
    return direct;
  }
  if (!thumbnailDir) {
    return null;
  }

  const root = resolve(thumbnailDir);
  const names = [
    candidate.imageId,
    candidate.sourceProductId,
    candidate.productSlug,
    `${candidate.productSlug}/${candidate.imageId}`,
  ];
  const extensions = [".jpg", ".jpeg", ".png", ".webp"];
  for (const name of names) {
    for (const extension of extensions) {
      const filePath = resolve(root, `${name}${extension}`);
      if (await fileExists(filePath)) {
        return filePath;
      }
    }
  }
  return null;
}

async function loadCandidates(args: Args): Promise<{ ready: UploadCandidate[]; missing: CandidateInput[] }> {
  const raw = JSON.parse(await readFile(args.candidates, "utf8")) as CandidateFile;
  if (!Array.isArray(raw.candidates)) {
    throw new Error(`Candidate file does not contain a candidates array: ${args.candidates}`);
  }

  const ready: UploadCandidate[] = [];
  const missing: CandidateInput[] = [];
  for (const candidate of raw.candidates.slice(0, args.limit)) {
    const localPath = await resolveThumbnailPath(candidate, args.thumbnailDir);
    if (!localPath) {
      missing.push(candidate);
      continue;
    }
    ready.push({
      ...candidate,
      storageBucket: candidate.suggestedStorageBucket ?? args.bucket,
      storagePath: cleanStoragePath(candidate.suggestedStoragePath ?? `${candidate.productSlug}/${candidate.imageId}${extname(localPath).toLowerCase()}`),
      localPath,
      contentType: contentTypeFor(localPath),
    });
  }
  return { ready, missing };
}

async function uploadObject(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  storagePath: string;
  fileBytes: Buffer;
  contentType: string;
  upsert: boolean;
}) {
  const endpoint = `${params.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(params.bucket)}/${params.storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.serviceRoleKey}`,
      apikey: params.serviceRoleKey,
      "Content-Type": params.contentType,
      "Cache-Control": "31536000",
      "x-upsert": String(params.upsert),
    },
    body: new Uint8Array(params.fileBytes),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Storage upload failed ${response.status}: ${body.slice(0, 500)}`);
  }
}

async function updateImageFallback(pool: pg.Pool, imageId: string, bucket: string, storagePath: string, publicUrl: string) {
  const result = await pool.query<{ product_id: string }>(
    `
    update shopping_product_images
    set
      status = 'mirrored',
      storage_bucket = $2,
      storage_path = $3,
      storage_public_url = $4,
      checked_at = coalesce(checked_at, now())
    where id = $1
    and status = 'broken'
    and storage_public_url is null
    returning product_id
    `,
    [imageId, bucket, storagePath, publicUrl],
  );
  return result.rows[0]?.product_id ?? null;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { ready, missing } = await loadCandidates(args);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const connectionString = process.env.DATABASE_URL;

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          ready: ready.length,
          missingLocalThumbnail: missing.length,
          uploads: ready.map((candidate) => ({
            imageId: candidate.imageId,
            localPath: candidate.localPath,
            storageBucket: candidate.storageBucket,
            storagePath: candidate.storagePath,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for fallback thumbnail uploads.");
  }
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });

  const uploaded: Array<{ imageId: string; storagePath: string; publicUrl: string }> = [];
  const skippedAfterUpload: string[] = [];
  const productIds = new Set<string>();
  try {
    const schemaReady = await pool.query<{ ready: string | null }>("select to_regclass('public.shopping_product_images')::text as ready");
    if (!schemaReady.rows[0]?.ready) {
      throw new Error("Amazon 2023 shopping schema is not installed.");
    }

    for (const candidate of ready) {
      const fileBytes = await readFile(candidate.localPath);
      await uploadObject({
        supabaseUrl,
        serviceRoleKey,
        bucket: candidate.storageBucket,
        storagePath: candidate.storagePath,
        fileBytes,
        contentType: candidate.contentType,
        upsert: args.upsert,
      });
      const publicUrl = publicObjectUrl(supabaseUrl, candidate.storageBucket, candidate.storagePath);
      const productId = await updateImageFallback(pool, candidate.imageId, candidate.storageBucket, candidate.storagePath, publicUrl);
      if (productId) {
        productIds.add(productId);
        uploaded.push({ imageId: candidate.imageId, storagePath: candidate.storagePath, publicUrl });
      } else {
        skippedAfterUpload.push(candidate.imageId);
      }
    }
    await refreshProductFallbackStatus(pool, [...productIds]);
    console.log(
      JSON.stringify(
        {
          dryRun: false,
          uploaded: uploaded.length,
          missingLocalThumbnail: missing.length,
          skippedAfterUpload: skippedAfterUpload.length,
          productsRefreshed: productIds.size,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
