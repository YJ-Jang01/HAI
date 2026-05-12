import mockData from "../data.json";

const SHELVES = [
  { key: "trending_now", title: "Trending Now" },
  { key: "relaxing_sunday", title: "Relaxing Sunday" },
  { key: "blockbuster_movies", title: "Blockbuster Movies" },
  { key: "new_releases", title: "New Releases" },
  { key: "my_list", title: "My List" },
];

export const API_BASE_URL = import.meta.env.VITE_NETFLIX_API_BASE_URL?.replace(/\/$/, "") ?? "";

function getAsset(item, type) {
  return item.assets?.find((asset) => asset.type === type)?.url ?? "";
}

function getAltText(item, type) {
  return item.assets?.find((asset) => asset.type === type)?.altText ?? `${item.title} ${type}`;
}

export function fromApiItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    tagSlugs: item.tags?.map((tag) => tag.slug) ?? [],
    tagLabels: item.tags?.map((tag) => tag.label) ?? [],
    thumbnailUrl: getAsset(item, "thumbnail") || getAsset(item, "hero"),
    heroUrl: getAsset(item, "hero") || getAsset(item, "thumbnail"),
    videoUrl: getAsset(item, "preview_video") || getAsset(item, "trailer"),
    altText: getAltText(item, "thumbnail"),
    episodes:
      item.episodes?.map((episode) => ({
        id: episode.id,
        title: episode.title,
        description: episode.description,
        durationLabel: episode.durationLabel,
      })) ?? [],
  };
}

function fromMockItem(item, index) {
  return {
    id: `mock-${index}`,
    slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    title: item.name,
    description: item.desc,
    tagSlugs: [item.tag],
    tagLabels: [item.tag],
    thumbnailUrl: item.img,
    heroUrl: item.img,
    videoUrl: item.video,
    altText: `${item.name} thumbnail`,
    episodes:
      item.episodes?.map((episode, episodeIndex) => ({
        id: `mock-${index}-episode-${episodeIndex}`,
        title: episode.title,
        description: episode.desc,
        durationLabel: episode.duration,
      })) ?? [],
  };
}

export function buildMockHome() {
  const items = mockData.map(fromMockItem);

  return {
    demo: "netflix",
    hero: items[0] ?? null,
    shelves: SHELVES.map((shelf, shelfIndex) => ({
      ...shelf,
      description: null,
      items: items.slice(shelfIndex * 6, shelfIndex * 6 + 6),
    })),
  };
}

export function fromApiHome(home) {
  return {
    demo: home.demo,
    hero: home.hero ? fromApiItem(home.hero) : null,
    shelves:
      home.shelves?.map((shelf) => ({
        key: shelf.key,
        title: shelf.title,
        description: shelf.description,
        items: shelf.items?.map(fromApiItem) ?? [],
      })) ?? [],
  };
}

export async function fetchHome() {
  if (!API_BASE_URL) {
    return buildMockHome();
  }

  const response = await fetch(`${API_BASE_URL}/api/demos/netflix/home`);
  if (!response.ok) {
    throw new Error("Failed to load Netflix home data.");
  }

  return fromApiHome(await response.json());
}

export async function fetchItemDetail(item) {
  if (!API_BASE_URL || item.episodes.length > 0) {
    return item;
  }

  const response = await fetch(`${API_BASE_URL}/api/demos/netflix/items/${item.slug || item.id}`);
  if (!response.ok) {
    throw new Error("Failed to load media detail.");
  }

  return fromApiItem(await response.json());
}
