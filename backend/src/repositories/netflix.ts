import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  demoSites,
  interactionLogs,
  mediaAssets,
  mediaEpisodeAssets,
  mediaEpisodes,
  mediaHeroItems,
  mediaItems,
  mediaItemTags,
  mediaShelfItems,
  mediaShelves,
  mediaTags,
} from "../db/schema.js";

export type MediaItemRow = typeof mediaItems.$inferSelect;

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 0 && rest > 0) {
    return `${hours}h ${rest}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export async function getNetflixSite() {
  const [site] = await db.select().from(demoSites).where(eq(demoSites.slug, "netflix")).limit(1);
  return site ?? null;
}

async function getItemTags(itemId: string) {
  return db
    .select({
      slug: mediaTags.slug,
      label: mediaTags.label,
    })
    .from(mediaItemTags)
    .innerJoin(mediaTags, eq(mediaItemTags.tagId, mediaTags.id))
    .where(eq(mediaItemTags.mediaItemId, itemId))
    .orderBy(asc(mediaTags.slug));
}

async function getItemAssets(itemId: string, assetTypes?: string[]) {
  const filters = [eq(mediaAssets.mediaItemId, itemId)];
  if (assetTypes?.length) {
    filters.push(inArray(mediaAssets.assetType, assetTypes));
  }

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(...filters))
    .orderBy(asc(mediaAssets.assetType), asc(mediaAssets.sortOrder));

  return rows.map((asset) => ({
    type: asset.assetType,
    url: asset.url,
    altText: asset.altText,
  }));
}

export async function serializeItemSummary(
  item: MediaItemRow,
  options: {
    assetTypes?: string[];
    titleOverride?: string | null;
    descriptionOverride?: string | null;
  } = {},
) {
  const [tags, assets] = await Promise.all([getItemTags(item.id), getItemAssets(item.id, options.assetTypes)]);

  return {
    id: item.id,
    slug: item.slug,
    title: options.titleOverride || item.title,
    description: options.descriptionOverride || item.description,
    contentType: item.contentType,
    tags,
    assets,
  };
}

async function serializeEpisode(episode: typeof mediaEpisodes.$inferSelect) {
  const assets = await db
    .select()
    .from(mediaEpisodeAssets)
    .where(eq(mediaEpisodeAssets.mediaEpisodeId, episode.id))
    .orderBy(asc(mediaEpisodeAssets.assetType), asc(mediaEpisodeAssets.sortOrder));

  return {
    id: episode.id,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    description: episode.description,
    durationSeconds: episode.durationSeconds,
    durationLabel: durationLabel(episode.durationSeconds),
    assets: assets.map((asset) => ({
      type: asset.assetType,
      url: asset.url,
      altText: null,
    })),
  };
}

export async function serializeItemDetail(item: MediaItemRow) {
  const summary = await serializeItemSummary(item);
  const episodes = await db
    .select()
    .from(mediaEpisodes)
    .where(eq(mediaEpisodes.mediaItemId, item.id))
    .orderBy(asc(mediaEpisodes.seasonNumber), asc(mediaEpisodes.episodeNumber));

  return {
    ...summary,
    episodes: await Promise.all(episodes.map(serializeEpisode)),
  };
}

export async function getHome(limitPerShelf?: number) {
  const site = await getNetflixSite();
  if (!site) {
    return null;
  }

  const [heroPlacement] = await db
    .select({
      placement: mediaHeroItems,
      item: mediaItems,
    })
    .from(mediaHeroItems)
    .innerJoin(mediaItems, eq(mediaHeroItems.mediaItemId, mediaItems.id))
    .where(and(eq(mediaHeroItems.demoSiteId, site.id), eq(mediaHeroItems.isActive, true)))
    .orderBy(asc(mediaHeroItems.sortOrder))
    .limit(1);

  const hero = heroPlacement
    ? await serializeItemSummary(heroPlacement.item, {
        assetTypes: ["hero", "preview_video"],
        titleOverride: heroPlacement.placement.titleOverride,
        descriptionOverride: heroPlacement.placement.descriptionOverride,
      })
    : null;

  return {
    demo: site.slug,
    hero,
    shelves: await getShelves(limitPerShelf),
  };
}

export async function getShelves(limitPerShelf?: number) {
  const site = await getNetflixSite();
  if (!site) {
    return null;
  }

  const shelves = await db
    .select()
    .from(mediaShelves)
    .where(eq(mediaShelves.demoSiteId, site.id))
    .orderBy(asc(mediaShelves.sortOrder));

  return Promise.all(
    shelves.map(async (shelf) => {
      const placementsQuery = db
        .select({
          item: mediaItems,
        })
        .from(mediaShelfItems)
        .innerJoin(mediaItems, eq(mediaShelfItems.mediaItemId, mediaItems.id))
        .where(eq(mediaShelfItems.shelfId, shelf.id))
        .orderBy(asc(mediaShelfItems.sortOrder));

      const placements = limitPerShelf === undefined ? await placementsQuery : await placementsQuery.limit(limitPerShelf);
      return {
        key: shelf.key,
        title: shelf.title,
        description: shelf.description,
        items: await Promise.all(placements.map((placement) => serializeItemSummary(placement.item, { assetTypes: ["thumbnail"] }))),
      };
    }),
  );
}

export async function findItemByIdOrSlug(siteId: string, itemId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId);
  const filters = [eq(mediaItems.demoSiteId, siteId), isUuid ? eq(mediaItems.id, itemId) : eq(mediaItems.slug, itemId)];

  const [item] = await db
    .select()
    .from(mediaItems)
    .where(and(...filters))
    .limit(1);

  return item ?? null;
}

export async function searchItems(params: { query?: string; tag?: string; limit: number; offset: number }) {
  const site = await getNetflixSite();
  if (!site) {
    return null;
  }

  const filters = [eq(mediaItems.demoSiteId, site.id)];
  if (params.query) {
    filters.push(or(ilike(mediaItems.title, `%${params.query}%`), ilike(mediaItems.description, `%${params.query}%`))!);
  }
  if (params.tag) {
    filters.push(eq(mediaTags.slug, params.tag));
  }

  const base = db
    .selectDistinct({ item: mediaItems })
    .from(mediaItems)
    .leftJoin(mediaItemTags, eq(mediaItems.id, mediaItemTags.mediaItemId))
    .leftJoin(mediaTags, eq(mediaItemTags.tagId, mediaTags.id))
    .where(and(...filters));

  const totalRows = await db
    .select({ value: sql<number>`count(distinct ${mediaItems.id})`.mapWith(Number) })
    .from(mediaItems)
    .leftJoin(mediaItemTags, eq(mediaItems.id, mediaItemTags.mediaItemId))
    .leftJoin(mediaTags, eq(mediaItemTags.tagId, mediaTags.id))
    .where(and(...filters));

  const rows = await base.orderBy(asc(mediaItems.title)).limit(params.limit).offset(params.offset);

  return {
    items: await Promise.all(rows.map((row) => serializeItemSummary(row.item, { assetTypes: ["thumbnail"] }))),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: totalRows[0]?.value ?? 0,
    },
  };
}

export async function createInteractionLog(input: {
  demo: string;
  sessionId: string;
  participantId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const [site] = await db.select().from(demoSites).where(eq(demoSites.slug, input.demo)).limit(1);
  if (!site) {
    return null;
  }

  const [log] = await db
    .insert(interactionLogs)
    .values({
      demoSiteId: site.id,
      sessionId: input.sessionId,
      participantId: input.participantId ?? null,
      eventType: input.eventType,
      payload: input.payload,
    })
    .returning({ id: interactionLogs.id });

  return log;
}

export async function clearNetflixCatalog(siteId: string) {
  await db.delete(mediaHeroItems).where(eq(mediaHeroItems.demoSiteId, siteId));
  await db.delete(mediaShelves).where(eq(mediaShelves.demoSiteId, siteId));
  await db.delete(mediaItems).where(eq(mediaItems.demoSiteId, siteId));
  await db.delete(mediaTags).where(eq(mediaTags.demoSiteId, siteId));
}

export async function getOrCreateNetflixSite() {
  const [site] = await db
    .insert(demoSites)
    .values({ slug: "netflix", displayName: "AIFLIX" })
    .onConflictDoUpdate({
      target: demoSites.slug,
      set: { displayName: "AIFLIX" },
    })
    .returning();

  return site;
}

export async function getLatestNetflixImportCounts() {
  const site = await getNetflixSite();
  if (!site) {
    return { mediaItems: 0, tags: 0, shelves: 0 };
  }

  const [itemCount] = await db.select({ value: count() }).from(mediaItems).where(eq(mediaItems.demoSiteId, site.id));
  const [tagCount] = await db.select({ value: count() }).from(mediaTags).where(eq(mediaTags.demoSiteId, site.id));
  const [shelfCount] = await db.select({ value: count() }).from(mediaShelves).where(eq(mediaShelves.demoSiteId, site.id));

  return {
    mediaItems: itemCount?.value ?? 0,
    tags: tagCount?.value ?? 0,
    shelves: shelfCount?.value ?? 0,
  };
}
