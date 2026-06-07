import {
  boolean,
  bigint,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const demoSites = pgTable("demo_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interactionLogs = pgTable(
  "interaction_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    participantId: text("participant_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_interaction_logs_session_time").on(table.sessionId, table.createdAt),
    index("idx_interaction_logs_demo_time").on(table.demoSiteId, table.createdAt),
  ],
);

export const shoppingDatasets = pgTable(
  "shopping_datasets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    sourceName: text("source_name").notNull(),
    sourceCategory: text("source_category").notNull(),
    sourceUrl: text("source_url"),
    subsetStrategy: text("subset_strategy").notNull().default("capacity_stratified_sampling"),
    dbBudgetBytes: bigint("db_budget_bytes", { mode: "number" }).notNull().default(430_000_000),
    storageStrategy: text("storage_strategy").notNull().default("external_url_with_selective_fallback"),
    rawManifest: jsonb("raw_manifest").notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const shoppingCategories = pgTable(
  "shopping_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => shoppingDatasets.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    sourcePath: text("source_path").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    depth: integer("depth").notNull().default(0),
    productCount: integer("product_count").notNull().default(0),
    includeInSeed: boolean("include_in_seed").notNull().default(true),
    exclusionReason: text("exclusion_reason"),
    rawCategory: jsonb("raw_category").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_shopping_categories_dataset_path").on(table.datasetId, table.sourcePath),
    uniqueIndex("uq_shopping_categories_dataset_slug").on(table.datasetId, table.slug),
    index("idx_shopping_categories_dataset_depth").on(table.datasetId, table.depth, table.slug),
  ],
);

export const shoppingProducts = pgTable(
  "shopping_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => shoppingDatasets.id, { onDelete: "cascade" }),
    sourceProductId: text("source_product_id").notNull(),
    parentAsin: text("parent_asin"),
    asin: text("asin"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    descriptionText: text("description_text"),
    priceAmount: numeric("price_amount", { precision: 12, scale: 2 }),
    currencyCode: text("currency_code").notNull().default("USD"),
    brand: text("brand"),
    store: text("store"),
    averageRating: numeric("average_rating", { precision: 3, scale: 2 }),
    ratingNumber: integer("rating_number").notNull().default(0),
    mainCategory: text("main_category"),
    categoryPath: jsonb("category_path").notNull().default([]),
    features: jsonb("features").notNull().default([]),
    description: jsonb("description").notNull().default([]),
    details: jsonb("details").notNull().default({}),
    localizedText: jsonb("localized_text").notNull().default({}),
    rawMetadata: jsonb("raw_metadata").notNull(),
    rawMetadataBytes: integer("raw_metadata_bytes").notNull().default(0),
    hasImageUrl: boolean("has_image_url").notNull().default(false),
    imageFallbackStatus: text("image_fallback_status").notNull().default("not_checked"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_shopping_products_dataset_source").on(table.datasetId, table.sourceProductId),
    uniqueIndex("uq_shopping_products_dataset_slug").on(table.datasetId, table.slug),
    index("idx_shopping_products_dataset_price").on(table.datasetId, table.priceAmount),
    index("idx_shopping_products_dataset_rating").on(table.datasetId, table.averageRating, table.ratingNumber),
    index("idx_shopping_products_dataset_brand").on(table.datasetId, table.brand),
    index("idx_shopping_products_dataset_store").on(table.datasetId, table.store),
    index("idx_shopping_products_dataset_category").on(table.datasetId, table.mainCategory),
  ],
);

export const shoppingProductCategoryPaths = pgTable(
  "shopping_product_category_paths",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => shoppingCategories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })],
);

export const shoppingProductImages = pgTable(
  "shopping_product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    variant: text("variant").notNull().default("source"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: text("status").notNull().default("unchecked"),
    httpStatus: integer("http_status"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    storageBucket: text("storage_bucket"),
    storagePath: text("storage_path"),
    storagePublicUrl: text("storage_public_url"),
    rawImage: jsonb("raw_image").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_shopping_product_images_source_variant").on(table.productId, table.sourceUrl, table.variant),
    index("idx_shopping_product_images_product_order").on(table.productId, table.isPrimary, table.sortOrder),
    index("idx_shopping_product_images_status").on(table.status, table.checkedAt),
  ],
);

export const shoppingProductAttributes = pgTable(
  "shopping_product_attributes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 12, scale: 2 }),
    valueBoolean: boolean("value_boolean"),
    valueJson: jsonb("value_json"),
    sourcePath: text("source_path").notNull(),
    isFacetCandidate: boolean("is_facet_candidate").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_shopping_product_attributes_product_key_path").on(table.productId, table.key, table.sourcePath),
    index("idx_shopping_product_attributes_key_text").on(table.key, table.valueText),
    index("idx_shopping_product_attributes_key_number").on(table.key, table.valueNumber),
  ],
);

export const shoppingProductSemanticAttributes = pgTable(
  "shopping_product_semantic_attributes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => shoppingDatasets.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 8, scale: 3 }),
    valueBoolean: boolean("value_boolean"),
    score: numeric("score", { precision: 6, scale: 4 }).notNull().default("0"),
    confidence: numeric("confidence", { precision: 6, scale: 4 }).notNull().default("0"),
    evidenceCount: integer("evidence_count").notNull().default(0),
    positiveCount: integer("positive_count").notNull().default(0),
    negativeCount: integer("negative_count").notNull().default(0),
    neutralCount: integer("neutral_count").notNull().default(0),
    source: text("source").notNull().default("hybrid"),
    sourceVersion: text("source_version").notNull().default("amazon2023_semantic_v1"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shopping_product_semantic_product_key").on(table.productId, table.key),
    index("idx_shopping_product_semantic_dataset_key_text").on(table.datasetId, table.key, table.valueText),
    index("idx_shopping_product_semantic_dataset_key_number").on(table.datasetId, table.key, table.valueNumber),
  ],
);

export const shoppingProductSearchDocuments = pgTable(
  "shopping_product_search_documents",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => shoppingDatasets.id, { onDelete: "cascade" }),
    searchText: text("search_text").notNull(),
    searchVector: tsvector("search_vector").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_shopping_product_search_documents_dataset").on(table.datasetId)],
);

export const shoppingReviews = pgTable(
  "shopping_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => shoppingDatasets.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    sourceReviewId: text("source_review_id").notNull(),
    reviewerIdHash: text("reviewer_id_hash"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    localizedText: jsonb("localized_text").notNull().default({}),
    helpfulVote: integer("helpful_vote").notNull().default(0),
    verifiedPurchase: boolean("verified_purchase"),
    reviewTimestamp: timestamp("review_timestamp", { withTimezone: true }),
    unixReviewTime: integer("unix_review_time"),
    rawReview: jsonb("raw_review").notNull(),
    rawReviewBytes: integer("raw_review_bytes").notNull().default(0),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_shopping_reviews_dataset_source").on(table.datasetId, table.sourceReviewId),
    index("idx_shopping_reviews_product_rating").on(table.productId, table.rating),
    index("idx_shopping_reviews_product_time").on(table.productId, table.reviewTimestamp),
  ],
);

export const shoppingReviewEvidence = pgTable(
  "shopping_review_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => shoppingProducts.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => shoppingReviews.id, { onDelete: "cascade" }),
    attributeKey: text("attribute_key").notNull(),
    attributeLabel: text("attribute_label").notNull(),
    sentiment: text("sentiment").notNull(),
    evidenceText: text("evidence_text").notNull(),
    localizedText: jsonb("localized_text").notNull().default({}),
    issueType: text("issue_type").notNull().default("none"),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    source: text("source").notNull().default("rule_extractor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shopping_review_evidence_product_attr").on(table.productId, table.attributeKey),
    index("idx_shopping_review_evidence_review").on(table.reviewId),
    index("idx_shopping_review_evidence_issue_sentiment").on(table.issueType, table.sentiment),
  ],
);

export const shoppingImportRuns = pgTable(
  "shopping_import_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id").references(() => shoppingDatasets.id, { onDelete: "set null" }),
    status: text("status").notNull().default("started"),
    mode: text("mode").notNull().default("profile"),
    phase: text("phase").notNull().default("init"),
    dbBudgetBytes: bigint("db_budget_bytes", { mode: "number" }).notNull().default(430_000_000),
    dbSizeBeforeBytes: bigint("db_size_before_bytes", { mode: "number" }),
    dbSizeAfterBytes: bigint("db_size_after_bytes", { mode: "number" }),
    productsScanned: integer("products_scanned").notNull().default(0),
    productsImported: integer("products_imported").notNull().default(0),
    reviewsScanned: integer("reviews_scanned").notNull().default(0),
    reviewsImported: integer("reviews_imported").notNull().default(0),
    rawManifest: jsonb("raw_manifest").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("idx_shopping_import_runs_status").on(table.status, table.startedAt)],
);

export const shoppingSeedSizeSamples = pgTable(
  "shopping_seed_size_samples",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => shoppingImportRuns.id, { onDelete: "cascade" }),
    chunkNumber: integer("chunk_number").notNull(),
    productsImported: integer("products_imported").notNull().default(0),
    reviewsImported: integer("reviews_imported").notNull().default(0),
    dbSizeBytes: bigint("db_size_bytes", { mode: "number" }).notNull(),
    productTableBytes: bigint("product_table_bytes", { mode: "number" }),
    reviewTableBytes: bigint("review_table_bytes", { mode: "number" }),
    rawBytesSeen: bigint("raw_bytes_seen", { mode: "number" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uq_shopping_seed_size_samples_run_chunk").on(table.importRunId, table.chunkNumber)],
);
