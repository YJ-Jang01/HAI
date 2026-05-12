import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { db, pool } from "../db/client.js";
import {
  mediaAssets,
  mediaEpisodes,
  mediaHeroItems,
  mediaItems,
  mediaItemTags,
  mediaShelfItems,
  mediaShelves,
  mediaTags,
} from "../db/schema.js";
import { slugify, uniqueSlug } from "../lib/slug.js";
import { clearNetflixCatalog, getLatestNetflixImportCounts, getOrCreateNetflixSite } from "../repositories/netflix.js";

type RawEpisode = {
  title: string;
  desc: string;
  duration: string;
};

type RawNetflixItem = {
  name: string;
  tag: string;
  img: string;
  video: string;
  desc: string;
  episodes?: RawEpisode[];
};

const shelves = [
  ["trending_now", "Trending Now"],
  ["relaxing_sunday", "Relaxing Sunday"],
  ["blockbuster_movies", "Blockbuster Movies"],
  ["new_releases", "New Releases"],
  ["my_list", "My List"],
] as const;

function durationToSeconds(duration: string) {
  const matches = duration.toLowerCase().matchAll(/(\d+)\s*([hms])/g);
  let total = 0;

  for (const match of matches) {
    const value = Number(match[1]);
    if (match[2] === "h") total += value * 3600;
    if (match[2] === "m") total += value * 60;
    if (match[2] === "s") total += value;
  }

  if (total > 0) {
    return total;
  }
  if (/^\d+$/.test(duration.trim())) {
    return Number(duration.trim()) * 60;
  }
  throw new Error(`Unsupported duration format: ${duration}`);
}

function validateRawItems(value: unknown): RawNetflixItem[] {
  if (!Array.isArray(value)) {
    throw new Error("Netflix mock data must be a JSON array.");
  }

  return value.map((item, index) => {
    const candidate = item as Partial<RawNetflixItem>;
    for (const key of ["name", "tag", "img", "video", "desc"] as const) {
      if (typeof candidate[key] !== "string" || candidate[key]?.trim() === "") {
        throw new Error(`Item at index ${index} is missing ${key}.`);
      }
    }
    return {
      name: candidate.name!,
      tag: candidate.tag!,
      img: candidate.img!,
      video: candidate.video!,
      desc: candidate.desc!,
      episodes: Array.isArray(candidate.episodes) ? candidate.episodes : [],
    };
  });
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../..");
  const dataPath = resolve(repoRoot, "frontend/Netflix/data.json");
  const raw = JSON.parse(await readFile(dataPath, "utf-8"));
  const rawItems = validateRawItems(raw);

  const site = await getOrCreateNetflixSite();
  await clearNetflixCatalog(site.id);

  const tagMap = new Map<string, string>();
  const itemIds: string[] = [];
  const usedSlugs = new Set<string>();

  for (const rawItem of rawItems) {
    const tagSlug = slugify(rawItem.tag);
    let tagId = tagMap.get(tagSlug);
    if (!tagId) {
      const [tag] = await db
        .insert(mediaTags)
        .values({
          demoSiteId: site.id,
          slug: tagSlug,
          label: rawItem.tag.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        })
        .returning({ id: mediaTags.id });
      tagId = tag.id;
      tagMap.set(tagSlug, tagId);
    }

    const [item] = await db
      .insert(mediaItems)
      .values({
        demoSiteId: site.id,
        slug: uniqueSlug(rawItem.name, usedSlugs),
        title: rawItem.name,
        description: rawItem.desc,
        contentType: "series",
      })
      .returning({ id: mediaItems.id });

    itemIds.push(item.id);

    await db.insert(mediaItemTags).values({ mediaItemId: item.id, tagId });

    await db.insert(mediaAssets).values([
      {
        mediaItemId: item.id,
        assetType: "thumbnail",
        url: rawItem.img,
        sortOrder: 0,
        altText: `${rawItem.name} thumbnail`,
      },
      {
        mediaItemId: item.id,
        assetType: "hero",
        url: rawItem.img,
        sortOrder: 0,
        altText: `${rawItem.name} hero image`,
      },
      {
        mediaItemId: item.id,
        assetType: "preview_video",
        url: rawItem.video,
        sortOrder: 0,
        altText: null,
      },
    ]);

    for (const [episodeIndex, episode] of rawItem.episodes?.entries() ?? []) {
      await db.insert(mediaEpisodes).values({
        mediaItemId: item.id,
        seasonNumber: 1,
        episodeNumber: episodeIndex + 1,
        title: episode.title,
        description: episode.desc,
        durationSeconds: durationToSeconds(episode.duration),
        sortOrder: episodeIndex,
      });
    }
  }

  for (const [shelfIndex, [key, title]] of shelves.entries()) {
    const [shelf] = await db
      .insert(mediaShelves)
      .values({
        demoSiteId: site.id,
        key,
        title,
        description: null,
        sortOrder: shelfIndex,
      })
      .returning({ id: mediaShelves.id });

    const start = shelfIndex * 6;
    for (const [itemIndex, itemId] of itemIds.slice(start, start + 6).entries()) {
      await db.insert(mediaShelfItems).values({
        shelfId: shelf.id,
        mediaItemId: itemId,
        sortOrder: itemIndex,
      });
    }
  }

  if (itemIds[0]) {
    await db.insert(mediaHeroItems).values({
      demoSiteId: site.id,
      mediaItemId: itemIds[0],
      sortOrder: 0,
      isActive: true,
    });
  }

  const counts = await getLatestNetflixImportCounts();
  console.log(`Imported ${counts.mediaItems} media items, ${counts.tags} tags, and ${counts.shelves} shelves into netflix.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
