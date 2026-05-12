import {
  boolean,
  index,
  integer,
  jsonb,
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
