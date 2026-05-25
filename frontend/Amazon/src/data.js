import productsUrl from "../products.json?url";
import reviewsUrl from "../review.json?url";

export const COLOR_GROUPS = {
  black: { label: "Black", css: "#111827" },
  white: { label: "White", css: "#ffffff" },
  gray: { label: "Gray", css: "#808080" },
  brown: { label: "Brown", css: "#8B4513" },
  tan: { label: "Tan", css: "#C19A6B" },
  green: { label: "Green", css: "#4A7C59" },
  blue: { label: "Blue", css: "#2F5BA8" },
  red: { label: "Red", css: "#D62828" },
  yellow: { label: "Yellow", css: "#E7B928" },
  pink: { label: "Pink", css: "#E49DB0" },
  purple: { label: "Purple", css: "#7D4E9C" },
  orange: { label: "Orange", css: "#E07A41" },
};

const COLOR_NAME_TO_GROUP = {
  amber: "orange",
  ash: "gray",
  aqua: "blue",
  beige: "tan",
  berry: "red",
  biscuit: "tan",
  blush: "pink",
  camel: "tan",
  caramel: "tan",
  charcoal: "gray",
  cherry: "red",
  chocolate: "brown",
  cobalt: "blue",
  coffee: "brown",
  copper: "orange",
  coral: "orange",
  denim: "blue",
  emerald: "green",
  espresso: "brown",
  fuchsia: "pink",
  gold: "yellow",
  graphite: "gray",
  ivory: "white",
  jade: "green",
  khaki: "tan",
  lavender: "purple",
  lemon: "yellow",
  lilac: "purple",
  lime: "green",
  magenta: "pink",
  maroon: "red",
  mint: "green",
  mocha: "brown",
  moss: "green",
  mustard: "yellow",
  navy: "blue",
  olive: "green",
  peach: "orange",
  pewter: "gray",
  pine: "green",
  plum: "purple",
  pumpkin: "orange",
  rose: "pink",
  royal: "blue",
  ruby: "red",
  sage: "green",
  sand: "tan",
  silver: "gray",
  slate: "gray",
  stone: "gray",
  taupe: "tan",
  teal: "blue",
  violet: "purple",
  wine: "red",
};

function normalizeColorLabel(value) {
  return String(value ?? "").toLowerCase().trim();
}

export function getColorGroupKey(colorName) {
  const key = normalizeColorLabel(colorName);
  if (!key) return "";
  if (COLOR_GROUPS[key]) return key;
  if (COLOR_NAME_TO_GROUP[key]) return COLOR_NAME_TO_GROUP[key];
  if (key.includes("black")) return "black";
  if (key.includes("white") || key.includes("cream") || key.includes("ivory")) return "white";
  if (key.includes("gray") || key.includes("grey") || key.includes("ash") || key.includes("charcoal")) return "gray";
  if (key.includes("tan") || key.includes("beige") || key.includes("camel") || key.includes("khaki")) return "tan";
  if (key.includes("brown") || key.includes("chocolate") || key.includes("mocha")) return "brown";
  if (key.includes("green") || key.includes("olive") || key.includes("sage")) return "green";
  if (key.includes("blue") || key.includes("navy") || key.includes("teal") || key.includes("denim")) return "blue";
  if (key.includes("red") || key.includes("wine") || key.includes("maroon")) return "red";
  if (key.includes("yellow") || key.includes("gold") || key.includes("mustard")) return "yellow";
  if (key.includes("pink") || key.includes("rose") || key.includes("blush")) return "pink";
  if (key.includes("purple") || key.includes("violet") || key.includes("plum")) return "purple";
  if (key.includes("orange") || key.includes("coral") || key.includes("amber")) return "orange";
  return "gray";
}

export function getColorGroupLabel(colorName) {
  const groupKey = getColorGroupKey(colorName);
  return COLOR_GROUPS[groupKey]?.label ?? String(colorName);
}

export function mapColorToCss(colorName) {
  const groupKey = getColorGroupKey(colorName);
  return COLOR_GROUPS[groupKey]?.css ?? "#cccccc";
}

export function parsePrice(value) {
  const parsed = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseReviewCount(value) {
  const parsed = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsePrice(value));
}

export function formatKrw(value) {
  return `₩ ${(parsePrice(value) * 1300).toLocaleString("ko-KR")}`;
}

export function normalizeProduct(product) {
  const rawColors = product.colors ?? product.color ?? [];
  const colors = Array.isArray(rawColors) ? rawColors : [rawColors].filter(Boolean);
  const rawSizes = product.sizes ?? product.availableSizes ?? product.size ?? [];
  const sizes = Array.isArray(rawSizes) ? rawSizes : [rawSizes].filter(Boolean);

  return {
    ...product,
    priceNumber: parsePrice(product.price),
    reviewCountNumber: parseReviewCount(product.reviewCount),
    colors,
    sizes,
    features: product.features ?? [],
    descImages: product.descImages ?? [],
    brandImages: product.brandImages ?? [],
    ratingDetail: product.ratingDetail ?? {},
  };
}

export async function loadCatalog() {
  const [productsResponse, reviewsResponse] = await Promise.all([fetch(productsUrl), fetch(reviewsUrl)]);

  if (!productsResponse.ok || !reviewsResponse.ok) {
    throw new Error("Failed to load Amazon catalog data.");
  }

  const [products, reviews] = await Promise.all([productsResponse.json(), reviewsResponse.json()]);
  return {
    products: products.map(normalizeProduct),
    reviews,
  };
}

export function getCategories(productList) {
  return [...new Set(productList.map((product) => product.category))];
}

export function getSubCategories(productList, category) {
  return [...new Set(productList.filter((product) => product.category === category).map((product) => product.subCategory).filter(Boolean))];
}

export function getCategoryColorFilters(productList, category) {
  const colorMap = new Map();
  productList
    .filter((product) => product.category === category)
    .forEach((product) => {
      product.colors.forEach((color) => {
        const label = getColorGroupLabel(color);
        if (!colorMap.has(label)) {
          colorMap.set(label, mapColorToCss(color));
        }
      });
    });
  return [...colorMap.entries()].map(([label, css]) => ({ label, css }));
}

export function getProductReviews(reviews, productId) {
  return reviews.filter((review) => Number(review.productId) === Number(productId));
}

export function getRelatedProducts(product, productList, limit = 5) {
  const currentWords = product.name.toLowerCase().split(/\s+/);
  return productList
    .filter((item) => item.id !== product.id)
    .map((item) => {
      const itemWords = item.name.toLowerCase().split(/\s+/);
      const wordScore = itemWords.filter((word) => currentWords.includes(word)).length * 2;
      const categoryScore = item.category === product.category ? 10 : 0;
      return { item, score: categoryScore + wordScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.id - b.item.id)
    .slice(0, limit)
    .map(({ item }) => item);
}
