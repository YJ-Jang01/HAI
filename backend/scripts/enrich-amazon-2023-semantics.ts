import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

type Args = {
  datasetSlug: string;
  mode: "dry-run" | "apply";
  maxDbMb: number;
  sourceVersion: string;
};

type ProductRow = {
  id: string;
  dataset_id: string;
  title: string;
  description_text: string | null;
  brand: string | null;
  store: string | null;
  main_category: string | null;
  category_path: unknown;
  features: unknown;
  description: unknown;
  details: unknown;
};

type EvidenceRow = {
  product_id: string;
  attribute_key: string;
  sentiment: string;
};

type EvidenceStats = {
  positive: number;
  negative: number;
  neutral: number;
};

type SemanticRow = {
  productId: string;
  datasetId: string;
  key: string;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  score: number;
  confidence: number;
  evidenceCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  source: string;
  sourceVersion: string;
};

const SEMANTIC_KEYS = [
  "genderTarget",
  "occasion",
  "season",
  "material",
  "style",
  "warmthLevel",
  "comfortLevel",
  "waterproof",
  "durabilityLevel",
  "careEaseLevel",
];

const MATERIAL_PATTERNS: Array<[string, RegExp]> = [
  ["cotton", /\b(cotton|면)\b/i],
  ["wool", /\b(wool|merino|cashmere|울)\b/i],
  ["leather", /\b(leather|suede|가죽)\b/i],
  ["polyester", /\b(polyester)\b/i],
  ["nylon", /\b(nylon)\b/i],
  ["denim", /\b(denim|jean|청바지)\b/i],
  ["fleece", /\b(fleece|플리스)\b/i],
  ["linen", /\b(linen|리넨|린넨)\b/i],
  ["rubber", /\b(rubber)\b/i],
  ["synthetic", /\b(synthetic|spandex|acrylic|polyurethane|rayon|elastane)\b/i],
];

function parseArgs(argv: string[]): Args {
  const args: Args = {
    datasetSlug: "amazon-fashion-2023",
    mode: "dry-run",
    maxDbMb: 490,
    sourceVersion: "amazon2023_semantic_v1",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;
    if (key === "--dataset-slug") args.datasetSlug = value;
    else if (key === "--mode") {
      if (value !== "dry-run" && value !== "apply") throw new Error("--mode must be dry-run or apply.");
      args.mode = value;
    } else if (key === "--max-db-mb") args.maxDbMb = Number(value);
    else if (key === "--source-version") args.sourceVersion = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!Number.isFinite(args.maxDbMb) || args.maxDbMb <= 0) {
    throw new Error("--max-db-mb must be a positive number.");
  }
  return args;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringify(value: unknown) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => stringify(item)).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, inner]) => `${key} ${stringify(inner)}`).join(" ");
  return String(value);
}

function normalizedText(product: ProductRow) {
  return [
    product.title,
    product.description_text,
    product.brand,
    product.store,
    product.main_category,
    stringify(product.category_path),
    stringify(product.features),
    stringify(product.description),
    stringify(product.details),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function categoryPath(product: ProductRow) {
  return jsonArray(product.category_path).map((item) => String(item));
}

function topCategory(product: ProductRow) {
  return categoryPath(product)[1]?.toLowerCase() ?? "unknown";
}

function inc(stats: EvidenceStats, sentiment: string) {
  if (sentiment === "positive") stats.positive += 1;
  else if (sentiment === "negative") stats.negative += 1;
  else stats.neutral += 1;
}

function emptyStats(): EvidenceStats {
  return { positive: 0, negative: 0, neutral: 0 };
}

function total(stats: EvidenceStats) {
  return stats.positive + stats.negative + stats.neutral;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 4) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function levelFromScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(1 + clamp(score) * 4)));
}

function smoothedScore(stats: EvidenceStats | undefined, prior = 0.5, priorStrength = 2) {
  const boundedPositive = Math.min(stats?.positive ?? 0, 5);
  const boundedNegative = Math.min(stats?.negative ?? 0, 5);
  const boundedNeutral = Math.min(stats?.neutral ?? 0, 3);
  const boundedTotal = boundedPositive + boundedNegative + boundedNeutral;
  return (boundedPositive + 0.5 * boundedNeutral + prior * priorStrength) / (boundedTotal + priorStrength);
}

function reviewConfidence(stats: EvidenceStats | undefined, base = 0.18) {
  const boundedTotal = Math.min(total(stats ?? emptyStats()), 5);
  return clamp(base + 0.58 * (1 - Math.exp(-boundedTotal / 2.5)), 0.12, 0.88);
}

function combineScore(metadataScore: number, metadataConfidence: number, stats: EvidenceStats | undefined, prior: number) {
  const reviewScore = smoothedScore(stats, prior);
  const reviewConf = reviewConfidence(stats);
  const totalWeight = metadataConfidence + reviewConf;
  const score = totalWeight > 0 ? (metadataScore * metadataConfidence + reviewScore * reviewConf) / totalWeight : prior;
  return {
    score: clamp(score),
    confidence: clamp(Math.max(metadataConfidence, reviewConf) * 0.75 + Math.min(metadataConfidence, reviewConf) * 0.25),
  };
}

function word(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function evidenceFor(productId: string, key: string, statsByProduct: Map<string, Map<string, EvidenceStats>>) {
  return statsByProduct.get(productId)?.get(key) ?? emptyStats();
}

function priorFor(product: ProductRow, key: string, priors: Map<string, Map<string, number>>) {
  return priors.get(topCategory(product))?.get(key) ?? priors.get("all")?.get(key) ?? 0.52;
}

function push(rows: SemanticRow[], seen: Set<string>, row: SemanticRow) {
  if (row.confidence < 0.12) return;
  const signature = [row.productId, row.key, row.valueText ?? "", row.valueNumber ?? "", row.valueBoolean ?? ""].join("|");
  if (seen.has(signature)) return;
  seen.add(signature);
  rows.push({
    ...row,
    score: round(row.score),
    confidence: round(row.confidence),
  });
}

function counts(stats: EvidenceStats | undefined) {
  const current = stats ?? emptyStats();
  return {
    evidenceCount: total(current),
    positiveCount: current.positive,
    negativeCount: current.negative,
    neutralCount: current.neutral,
  };
}

function addTextAttribute(rows: SemanticRow[], seen: Set<string>, product: ProductRow, key: string, valueText: string, score: number, confidence: number, source: string, sourceVersion: string, stats?: EvidenceStats) {
  push(rows, seen, {
    productId: product.id,
    datasetId: product.dataset_id,
    key,
    valueText,
    valueNumber: null,
    valueBoolean: null,
    score,
    confidence,
    ...counts(stats),
    source,
    sourceVersion,
  });
}

function addNumberAttribute(rows: SemanticRow[], seen: Set<string>, product: ProductRow, key: string, valueNumber: number, score: number, confidence: number, source: string, sourceVersion: string, stats?: EvidenceStats) {
  push(rows, seen, {
    productId: product.id,
    datasetId: product.dataset_id,
    key,
    valueText: null,
    valueNumber,
    valueBoolean: null,
    score,
    confidence,
    ...counts(stats),
    source,
    sourceVersion,
  });
}

function addBooleanAttribute(rows: SemanticRow[], seen: Set<string>, product: ProductRow, key: string, valueBoolean: boolean, score: number, confidence: number, source: string, sourceVersion: string, stats?: EvidenceStats) {
  push(rows, seen, {
    productId: product.id,
    datasetId: product.dataset_id,
    key,
    valueText: null,
    valueNumber: null,
    valueBoolean,
    score,
    confidence,
    ...counts(stats),
    source,
    sourceVersion,
  });
}

function semanticRowsForProduct(product: ProductRow, statsByProduct: Map<string, Map<string, EvidenceStats>>, priors: Map<string, Map<string, number>>, sourceVersion: string) {
  const rows: SemanticRow[] = [];
  const seen = new Set<string>();
  const text = normalizedText(product);
  const path = categoryPath(product).join(" ").toLowerCase();

  const genderRules: Array<[string, RegExp]> = [
    ["girls", /\b(girls?|girl's)\b/],
    ["boys", /\b(boys?|boy's)\b/],
    ["baby", /\b(baby|infant|toddler)\b/],
    ["women", /\b(women|woman|women's|female|ladies)\b/],
    ["men", /\b(men|man's|men's|male|mens)\b/],
    ["unisex", /\b(unisex)\b/],
  ];
  const gender = genderRules.find(([, pattern]) => pattern.test(path) || pattern.test(text))?.[0];
  if (gender) addTextAttribute(rows, seen, product, "genderTarget", gender, 0.92, 0.88, "taxonomy_metadata", sourceVersion);

  for (const [material, pattern] of MATERIAL_PATTERNS) {
    if (word(text, pattern)) {
      addTextAttribute(rows, seen, product, "material", material, 0.82, 0.7, "metadata", sourceVersion);
    }
    if (rows.filter((row) => row.key === "material").length >= 2) break;
  }

  const occasionRules: Array<[string, RegExp, number]> = [
    ["school", /\b(school|student|kids?|girls?|boys?|backpack|lunch)\b/, 0.54],
    ["commute", /\b(commute|commuter|laptop|backpack|tote|crossbody|briefcase|waterproof|rain|walking|travel)\b/, 0.56],
    ["office", /\b(office|business|work|formal|loafer|dress shirt|blazer|briefcase)\b/, 0.58],
    ["travel", /\b(travel|luggage|passport|duffel|weekender|carry on|airport)\b/, 0.62],
    ["outdoor", /\b(outdoor|hiking|trail|waterproof|rain|winter|snow|boot|sport)\b/, 0.58],
    ["formal", /\b(formal|wedding|dressy|gown|tie|suit)\b/, 0.62],
    ["daily", /\b(casual|everyday|daily|tee|t-shirt|sneaker|jeans|hoodie|wallet|cap)\b/, 0.55],
  ];
  for (const [occasion, pattern, confidence] of occasionRules) {
    if (word(text, pattern)) addTextAttribute(rows, seen, product, "occasion", occasion, confidence + 0.2, confidence, "metadata_rule", sourceVersion);
  }

  const winterSignal = word(text, /\b(winter|snow|warm|insulated|lined|fleece|wool|coat|parka|puffer|boot)\b/);
  const summerSignal = word(text, /\b(summer|sandals?|linen|breathable|lightweight|shorts|sun|swim)\b/);
  if (winterSignal) addTextAttribute(rows, seen, product, "season", "winter", 0.8, 0.66, "metadata_rule", sourceVersion);
  if (summerSignal) addTextAttribute(rows, seen, product, "season", "summer", 0.76, 0.62, "metadata_rule", sourceVersion);

  const styleRules: Array<[string, RegExp, number]> = [
    ["sporty", /\b(sport|running|athletic|gym|baseball|training|sneaker|hiking)\b/, 0.63],
    ["formal", /\b(formal|wedding|business|dressy|suit|tie|loafer|gown)\b/, 0.64],
    ["outdoor", /\b(outdoor|trail|hiking|waterproof|snow|camp|parka|boot)\b/, 0.62],
    ["cute", /\b(cute|heart|disney|stitch|mickey|plush|bow|flower|kids?)\b/, 0.56],
    ["classic", /\b(classic|plain|solid|minimal|clean|leather|wool|chino|shirt)\b/, 0.56],
    ["casual", /\b(casual|tee|hoodie|jeans|cap|everyday|sneaker|wallet)\b/, 0.54],
  ];
  for (const [style, pattern, confidence] of styleRules) {
    if (word(text, pattern)) addTextAttribute(rows, seen, product, "style", style, confidence + 0.2, confidence, "metadata_rule", sourceVersion);
  }

  const warmthStats = evidenceFor(product.id, "warmth", statsByProduct);
  const warmthMetaScore = winterSignal ? 0.76 : word(text, /\b(thin|breathable|summer)\b/) ? 0.32 : 0.5;
  const warmthMetaConfidence = winterSignal ? 0.62 : 0.2;
  const warmth = combineScore(warmthMetaScore, warmthMetaConfidence, warmthStats, priorFor(product, "warmth", priors));
  if (winterSignal || total(warmthStats) > 0) {
    addNumberAttribute(rows, seen, product, "warmthLevel", levelFromScore(warmth.score), warmth.score, warmth.confidence, "hybrid_smoothed", sourceVersion, warmthStats);
  }

  const comfortStats = evidenceFor(product.id, "comfort", statsByProduct);
  const comfortMetaSignal = word(text, /\b(comfortable|comfy|soft|cushion|padded|stretch|lightweight)\b/);
  const comfort = combineScore(comfortMetaSignal ? 0.78 : 0.52, comfortMetaSignal ? 0.54 : 0.18, comfortStats, priorFor(product, "comfort", priors));
  if (comfortMetaSignal || total(comfortStats) > 0) {
    addNumberAttribute(rows, seen, product, "comfortLevel", levelFromScore(comfort.score), comfort.score, comfort.confidence, "hybrid_smoothed", sourceVersion, comfortStats);
  }

  const waterStats = evidenceFor(product.id, "waterproof", statsByProduct);
  const waterMetaSignal = word(text, /\b(waterproof|water resistant|rain|weatherproof|snow)\b/);
  const water = combineScore(waterMetaSignal ? 0.86 : 0.2, waterMetaSignal ? 0.68 : 0.12, waterStats, priorFor(product, "waterproof", priors));
  if (waterMetaSignal || total(waterStats) > 0) {
    addBooleanAttribute(rows, seen, product, "waterproof", water.score >= 0.58, water.score, water.confidence, "hybrid_smoothed", sourceVersion, waterStats);
  }

  const durabilityStats = evidenceFor(product.id, "durability", statsByProduct);
  const durabilityMetaSignal = word(text, /\b(durable|sturdy|heavy duty|high quality|leather|wool|rubber|reinforced)\b/);
  const durability = combineScore(durabilityMetaSignal ? 0.72 : 0.52, durabilityMetaSignal ? 0.5 : 0.16, durabilityStats, priorFor(product, "durability", priors));
  if (durabilityMetaSignal || total(durabilityStats) > 0) {
    addNumberAttribute(rows, seen, product, "durabilityLevel", levelFromScore(durability.score), durability.score, durability.confidence, "hybrid_smoothed", sourceVersion, durabilityStats);
  }

  const careStats = evidenceFor(product.id, "care", statsByProduct);
  const easyCareSignal = word(text, /\b(machine wash|machine washable|washable|easy clean|wipe clean)\b/);
  const difficultCareSignal = word(text, /\b(dry clean|hand wash only|spot clean)\b/);
  const careMetaScore = easyCareSignal ? 0.82 : difficultCareSignal ? 0.34 : 0.5;
  const careMetaConfidence = easyCareSignal || difficultCareSignal ? 0.58 : 0.14;
  const care = combineScore(careMetaScore, careMetaConfidence, careStats, priorFor(product, "care", priors));
  if (easyCareSignal || difficultCareSignal || total(careStats) > 0) {
    addNumberAttribute(rows, seen, product, "careEaseLevel", levelFromScore(care.score), care.score, care.confidence, "hybrid_smoothed", sourceVersion, careStats);
  }

  return rows;
}

function buildEvidenceMaps(products: ProductRow[], evidence: EvidenceRow[]) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const statsByProduct = new Map<string, Map<string, EvidenceStats>>();
  const statsByCategory = new Map<string, Map<string, EvidenceStats>>();

  for (const row of evidence) {
    const product = productById.get(row.product_id);
    if (!product) continue;
    const productStats = statsByProduct.get(row.product_id) ?? new Map<string, EvidenceStats>();
    const byKey = productStats.get(row.attribute_key) ?? emptyStats();
    inc(byKey, row.sentiment);
    productStats.set(row.attribute_key, byKey);
    statsByProduct.set(row.product_id, productStats);

    for (const category of [topCategory(product), "all"]) {
      const categoryStats = statsByCategory.get(category) ?? new Map<string, EvidenceStats>();
      const categoryKeyStats = categoryStats.get(row.attribute_key) ?? emptyStats();
      inc(categoryKeyStats, row.sentiment);
      categoryStats.set(row.attribute_key, categoryKeyStats);
      statsByCategory.set(category, categoryStats);
    }
  }

  const priors = new Map<string, Map<string, number>>();
  for (const [category, categoryStats] of statsByCategory) {
    const values = new Map<string, number>();
    for (const [key, stats] of categoryStats) {
      values.set(key, (stats.positive + 1) / (stats.positive + stats.negative + 2));
    }
    priors.set(category, values);
  }
  return { statsByProduct, priors };
}

function summarizeRows(rows: SemanticRow[]) {
  const byKey = new Map<string, number>();
  const confidenceByKey = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    byKey.set(row.key, (byKey.get(row.key) ?? 0) + 1);
    const current = confidenceByKey.get(row.key) ?? { sum: 0, count: 0 };
    current.sum += row.confidence;
    current.count += 1;
    confidenceByKey.set(row.key, current);
  }
  return SEMANTIC_KEYS.map((key) => {
    const confidence = confidenceByKey.get(key);
    return {
      key,
      rows: byKey.get(key) ?? 0,
      avgConfidence: confidence ? round(confidence.sum / confidence.count) : null,
    };
  });
}

async function databaseSize(pool: pg.Pool) {
  const result = await pool.query<{ bytes: string; pretty: string }>("select pg_database_size(current_database())::bigint as bytes, pg_size_pretty(pg_database_size(current_database())) as pretty");
  return { bytes: Number(result.rows[0].bytes), pretty: result.rows[0].pretty };
}

async function tableExists(pool: pg.Pool) {
  const result = await pool.query<{ ready: string | null }>("select to_regclass('public.shopping_product_semantic_attributes')::text as ready");
  return Boolean(result.rows[0]?.ready);
}

async function insertRows(pool: pg.Pool, datasetId: string, sourceVersion: string, rows: SemanticRow[]) {
  await pool.query("delete from shopping_product_semantic_attributes where dataset_id = $1 and source_version = $2", [datasetId, sourceVersion]);
  const chunkSize = 1000;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values = chunk.flatMap((row) => [
      row.productId,
      row.datasetId,
      row.key,
      row.valueText,
      row.valueNumber,
      row.valueBoolean,
      row.score,
      row.confidence,
      row.evidenceCount,
      row.positiveCount,
      row.negativeCount,
      row.neutralCount,
      row.source,
      row.sourceVersion,
    ]);
    const tuples = chunk.map((_, index) => {
      const base = index * 14;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
    });
    await pool.query(
      `
      insert into shopping_product_semantic_attributes (
        product_id, dataset_id, key, value_text, value_number, value_boolean,
        score, confidence, evidence_count, positive_count, negative_count, neutral_count,
        source, source_version
      )
      values ${tuples.join(",\n")}
      on conflict do nothing
      `,
      values,
    );
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
    const dataset = await pool.query<{ id: string }>("select id from shopping_datasets where slug = $1", [args.datasetSlug]);
    const datasetId = dataset.rows[0]?.id;
    if (!datasetId) throw new Error(`Dataset not found: ${args.datasetSlug}`);

    const products = await pool.query<ProductRow>(
      `
      select
        id, dataset_id, title, description_text, brand, store, main_category,
        category_path, features, description, details
      from shopping_products
      where dataset_id = $1
      order by id
      `,
      [datasetId],
    );
    const evidence = await pool.query<EvidenceRow>(
      `
      select product_id, attribute_key, sentiment
      from shopping_review_evidence
      where product_id in (select id from shopping_products where dataset_id = $1)
      `,
      [datasetId],
    );
    const { statsByProduct, priors } = buildEvidenceMaps(products.rows, evidence.rows);
    const rows = products.rows.flatMap((product) => semanticRowsForProduct(product, statsByProduct, priors, args.sourceVersion));
    const before = await databaseSize(pool);
    const estimatedBytes = Math.round(rows.length * 220);
    const projectedBytes = before.bytes + estimatedBytes;
    const maxBytes = Math.round(args.maxDbMb * 1024 * 1024);
    const summary = {
      dataset: args.datasetSlug,
      mode: args.mode,
      sourceVersion: args.sourceVersion,
      products: products.rowCount,
      evidenceRows: evidence.rowCount,
      semanticRows: rows.length,
      estimatedBytes,
      dbSizeBefore: before,
      projectedDbBytes: projectedBytes,
      projectedDbPretty: `${Math.round(projectedBytes / 1024 / 1024)} MB`,
      maxDbMb: args.maxDbMb,
      rowsByKey: summarizeRows(rows),
    };

    if (projectedBytes > maxBytes) {
      console.log(JSON.stringify({ ...summary, applied: false, reason: "projected_db_size_over_budget" }, null, 2));
      throw new Error(`Projected semantic enrichment size exceeds ${args.maxDbMb}MB budget.`);
    }

    if (args.mode === "apply") {
      if (!(await tableExists(pool))) {
        throw new Error("shopping_product_semantic_attributes is missing. Apply backend/drizzle/0010_amazon2023_semantic_attributes.sql first.");
      }
      await insertRows(pool, datasetId, args.sourceVersion, rows);
      const after = await databaseSize(pool);
      console.log(JSON.stringify({ ...summary, applied: true, dbSizeAfter: after, dbSizeDeltaBytes: after.bytes - before.bytes }, null, 2));
      if (after.bytes > maxBytes) {
        throw new Error(`DB size after semantic enrichment exceeds ${args.maxDbMb}MB budget: ${after.pretty}.`);
      }
    } else {
      console.log(JSON.stringify({ ...summary, applied: false }, null, 2));
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
