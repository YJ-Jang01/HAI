import {
  boolean,
  date,
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

export const demoSites = pgTable("demo_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uq_media_items_demo_slug").on(table.demoSiteId, table.slug)],
);

export const mediaTags = pgTable(
  "media_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
  },
  (table) => [uniqueIndex("uq_media_tags_demo_slug").on(table.demoSiteId, table.slug)],
);

export const mediaItemTags = pgTable(
  "media_item_tags",
  {
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => mediaTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.mediaItemId, table.tagId] }),
    index("idx_media_item_tags_tag_item").on(table.tagId, table.mediaItemId),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
  },
  (table) => [
    uniqueIndex("uq_media_assets_item_type_order").on(table.mediaItemId, table.assetType, table.sortOrder),
    index("idx_media_assets_item_type_order").on(table.mediaItemId, table.assetType, table.sortOrder),
  ],
);

export const mediaEpisodes = pgTable(
  "media_episodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull().default(1),
    episodeNumber: integer("episode_number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_media_episodes_item_episode").on(
      table.mediaItemId,
      table.seasonNumber,
      table.episodeNumber,
    ),
    index("idx_media_episodes_item_order").on(table.mediaItemId, table.seasonNumber, table.episodeNumber),
  ],
);

export const mediaEpisodeAssets = pgTable(
  "media_episode_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaEpisodeId: uuid("media_episode_id")
      .notNull()
      .references(() => mediaEpisodes.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_media_episode_assets_episode_type_order").on(
      table.mediaEpisodeId,
      table.assetType,
      table.sortOrder,
    ),
    index("idx_media_episode_assets_episode_type_order").on(
      table.mediaEpisodeId,
      table.assetType,
      table.sortOrder,
    ),
  ],
);

export const mediaShelves = pgTable(
  "media_shelves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_media_shelves_demo_key").on(table.demoSiteId, table.key),
    index("idx_media_shelves_demo_order").on(table.demoSiteId, table.sortOrder),
  ],
);

export const mediaHeroItems = pgTable(
  "media_hero_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    titleOverride: text("title_override"),
    descriptionOverride: text("description_override"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("uq_media_hero_items_demo_order").on(table.demoSiteId, table.sortOrder),
    index("idx_media_hero_items_demo_active_order").on(table.demoSiteId, table.isActive, table.sortOrder),
  ],
);

export const mediaShelfItems = pgTable(
  "media_shelf_items",
  {
    shelfId: uuid("shelf_id")
      .notNull()
      .references(() => mediaShelves.id, { onDelete: "cascade" }),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.shelfId, table.mediaItemId] }),
    uniqueIndex("uq_media_shelf_items_shelf_order").on(table.shelfId, table.sortOrder),
    index("idx_media_shelf_items_shelf_order").on(table.shelfId, table.sortOrder),
  ],
);

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

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_categories_demo_slug").on(table.demoSiteId, table.slug),
    index("idx_product_categories_demo_order").on(table.demoSiteId, table.sortOrder),
  ],
);

export const productSubcategories = pgTable(
  "product_subcategories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_subcategories_category_slug").on(table.categoryId, table.slug),
    index("idx_product_subcategories_category_order").on(table.categoryId, table.sortOrder),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id")
      .notNull()
      .references(() => productSubcategories.id, { onDelete: "restrict" }),
    externalId: integer("external_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    keyword: text("keyword"),
    description: text("description").notNull(),
    brandStory: text("brand_story"),
    priceAmount: numeric("price_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code").notNull().default("USD"),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_products_demo_external_id").on(table.demoSiteId, table.externalId),
    uniqueIndex("uq_products_demo_slug").on(table.demoSiteId, table.slug),
    index("idx_products_demo_external_id").on(table.demoSiteId, table.externalId),
    index("idx_products_demo_category_external").on(table.demoSiteId, table.categoryId, table.externalId),
    index("idx_products_demo_subcategory_external").on(table.demoSiteId, table.subcategoryId, table.externalId),
    index("idx_products_demo_price_external").on(table.demoSiteId, table.priceAmount, table.externalId),
    index("idx_products_demo_rating_external").on(table.demoSiteId, table.rating, table.externalId),
    index("idx_products_demo_review_count_external").on(table.demoSiteId, table.reviewCount, table.externalId),
    index("idx_products_category").on(table.categoryId),
    index("idx_products_subcategory").on(table.subcategoryId),
  ],
);

export const productAssets = pgTable(
  "product_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
  },
  (table) => [
    uniqueIndex("uq_product_assets_product_type_order").on(table.productId, table.assetType, table.sortOrder),
    index("idx_product_assets_product_type_order").on(table.productId, table.assetType, table.sortOrder),
  ],
);

export const productFeatures = pgTable(
  "product_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    featureText: text("feature_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_features_product_order").on(table.productId, table.sortOrder),
    index("idx_product_features_product_order").on(table.productId, table.sortOrder),
  ],
);

export const productOptionGroups = pgTable(
  "product_option_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_option_groups_product_name").on(table.productId, table.name),
    uniqueIndex("uq_product_option_groups_product_order").on(table.productId, table.sortOrder),
    index("idx_product_option_groups_product_order").on(table.productId, table.sortOrder),
  ],
);

export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    optionGroupId: uuid("option_group_id")
      .notNull()
      .references(() => productOptionGroups.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_option_values_group_value").on(table.optionGroupId, table.value),
    uniqueIndex("uq_product_option_values_group_order").on(table.optionGroupId, table.sortOrder),
    index("idx_product_option_values_group_order").on(table.optionGroupId, table.sortOrder),
  ],
);

export const productRatingBreakdown = pgTable(
  "product_rating_breakdown",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ratingValue: integer("rating_value").notNull(),
    percentage: integer("percentage").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.ratingValue] }),
    index("idx_product_rating_breakdown_product").on(table.productId),
  ],
);

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    externalId: integer("external_id").notNull(),
    userName: text("user_name").notNull(),
    rating: integer("rating").notNull(),
    reviewDate: date("review_date").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_product_reviews_product_external_id").on(table.productId, table.externalId),
    index("idx_product_reviews_product_date").on(table.productId, table.reviewDate),
    index("idx_product_reviews_product_rating").on(table.productId, table.rating),
  ],
);

export const productAttributeDefinitions = pgTable(
  "product_attribute_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    demoSiteId: uuid("demo_site_id")
      .notNull()
      .references(() => demoSites.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull(),
    unit: text("unit"),
    minValue: numeric("min_value", { precision: 12, scale: 2 }),
    maxValue: numeric("max_value", { precision: 12, scale: 2 }),
    description: text("description").notNull(),
    isFilterable: boolean("is_filterable").notNull().default(true),
    isRangeFacet: boolean("is_range_facet").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_product_attribute_definitions_demo_key").on(table.demoSiteId, table.key),
    index("idx_product_attribute_definitions_demo_order").on(table.demoSiteId, table.sortOrder),
  ],
);

export const productAttributeOptions = pgTable(
  "product_attribute_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attributeDefinitionId: uuid("attribute_definition_id")
      .notNull()
      .references(() => productAttributeDefinitions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_product_attribute_options_definition_value").on(table.attributeDefinitionId, table.value),
    index("idx_product_attribute_options_definition_order").on(table.attributeDefinitionId, table.sortOrder),
  ],
);

export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attributeDefinitionId: uuid("attribute_definition_id")
      .notNull()
      .references(() => productAttributeDefinitions.id, { onDelete: "cascade" }),
    optionId: uuid("option_id").references(() => productAttributeOptions.id, { onDelete: "restrict" }),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 12, scale: 2 }),
    valueBoolean: boolean("value_boolean"),
    source: text("source").notNull().default("generated"),
    humanReviewStatus: text("human_review_status").notNull().default("generated"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_product_attribute_values_product_definition").on(table.productId, table.attributeDefinitionId),
    index("idx_product_attribute_values_product_definition").on(table.productId, table.attributeDefinitionId),
    index("idx_product_attribute_values_definition_number").on(table.attributeDefinitionId, table.valueNumber),
    index("idx_product_attribute_values_definition_boolean").on(table.attributeDefinitionId, table.valueBoolean),
    index("idx_product_attribute_values_definition_option").on(table.attributeDefinitionId, table.optionId),
  ],
);

export const productReviewEvidence = pgTable(
  "product_review_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    attributeDefinitionId: uuid("attribute_definition_id")
      .notNull()
      .references(() => productAttributeDefinitions.id, { onDelete: "cascade" }),
    sentiment: text("sentiment").notNull(),
    evidenceText: text("evidence_text").notNull(),
    source: text("source").notNull().default("generated"),
    humanReviewStatus: text("human_review_status").notNull().default("generated"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_review_evidence_review").on(table.reviewId),
    index("idx_product_review_evidence_attribute").on(table.attributeDefinitionId),
  ],
);
