import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { db, pool } from "../db/client.js";
import {
  productAssets,
  productCategories,
  productFeatures,
  productOptionGroups,
  productOptionValues,
  productRatingBreakdown,
  productReviews,
  products,
  productSubcategories,
} from "../db/schema.js";
import { slugify, uniqueSlug } from "../lib/slug.js";
import { clearAmazonCatalog, getLatestAmazonImportCounts, getOrCreateAmazonSite } from "../repositories/amazon.js";

type RawProduct = {
  id: number;
  name: string;
  keyword?: string;
  category: string;
  subCategory: string;
  price: string | number;
  rating: number;
  reviewCount: string | number;
  ratingDetail: Record<string, number>;
  img: string;
  brandStory?: string;
  desc: string;
  sizes?: string[];
  colors?: string[];
  features?: string[];
  descImages?: string[];
  brandImages?: string[];
};

type RawReview = {
  id: number;
  productId: number;
  userName: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
};

function requireString(value: unknown, field: string, index: number) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Product at index ${index} is missing ${field}.`);
  }
  return value.trim();
}

function parsePrice(value: string | number) {
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid product price: ${value}`);
  }
  return parsed.toFixed(2);
}

function parseReviewCount(value: string | number) {
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid review count: ${value}`);
  }
  return parsed;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid review date: ${value}`);
  }
  return value;
}

function validateProducts(value: unknown): RawProduct[] {
  if (!Array.isArray(value)) {
    throw new Error("Amazon products data must be a JSON array.");
  }

  const ids = new Set<number>();
  return value.map((item, index) => {
    const candidate = item as Partial<RawProduct>;
    const id = Number(candidate.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Product at index ${index} has an invalid id.`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate product id: ${id}`);
    }
    ids.add(id);

    return {
      id,
      name: requireString(candidate.name, "name", index),
      keyword: typeof candidate.keyword === "string" ? candidate.keyword.trim() : undefined,
      category: requireString(candidate.category, "category", index),
      subCategory: requireString(candidate.subCategory, "subCategory", index),
      price: candidate.price ?? "",
      rating: Number(candidate.rating),
      reviewCount: candidate.reviewCount ?? 0,
      ratingDetail: candidate.ratingDetail ?? {},
      img: requireString(candidate.img, "img", index),
      brandStory: typeof candidate.brandStory === "string" ? candidate.brandStory.trim() : undefined,
      desc: requireString(candidate.desc, "desc", index),
      sizes: Array.isArray(candidate.sizes) ? candidate.sizes.filter(Boolean) : [],
      colors: Array.isArray(candidate.colors) ? candidate.colors.filter(Boolean) : [],
      features: Array.isArray(candidate.features) ? candidate.features.filter(Boolean) : [],
      descImages: Array.isArray(candidate.descImages) ? candidate.descImages.filter(Boolean) : [],
      brandImages: Array.isArray(candidate.brandImages) ? candidate.brandImages.filter(Boolean) : [],
    };
  });
}

function validateReviews(value: unknown, productIds: Set<number>): RawReview[] {
  if (!Array.isArray(value)) {
    throw new Error("Amazon review data must be a JSON array.");
  }

  const ids = new Set<number>();
  return value.map((item, index) => {
    const candidate = item as Partial<RawReview>;
    const id = Number(candidate.id);
    const productId = Number(candidate.productId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Review at index ${index} has an invalid id.`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate review id: ${id}`);
    }
    ids.add(id);
    if (!productIds.has(productId)) {
      throw new Error(`Review ${id} references missing product ${productId}.`);
    }

    return {
      id,
      productId,
      userName: requireString(candidate.userName, "userName", index),
      rating: Number(candidate.rating),
      date: parseDate(requireString(candidate.date, "date", index)),
      title: requireString(candidate.title, "title", index),
      comment: requireString(candidate.comment, "comment", index),
    };
  });
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../..");
  const productsPath = resolve(repoRoot, "frontend/Amazon/products.json");
  const reviewsPath = resolve(repoRoot, "frontend/Amazon/review.json");

  const rawProducts = validateProducts(JSON.parse(await readFile(productsPath, "utf-8")));
  const rawReviews = validateReviews(
    JSON.parse(await readFile(reviewsPath, "utf-8")),
    new Set(rawProducts.map((product) => product.id)),
  );

  const site = await getOrCreateAmazonSite();
  await clearAmazonCatalog(site.id);

  const categoryIds = new Map<string, string>();
  const subcategoryIds = new Map<string, string>();
  const productIds = new Map<number, string>();
  const usedProductSlugs = new Set<string>();

  for (const rawProduct of rawProducts) {
    const categorySlug = slugify(rawProduct.category) || `category-${categoryIds.size + 1}`;
    let categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      const [category] = await db
        .insert(productCategories)
        .values({
          demoSiteId: site.id,
          slug: categorySlug,
          name: rawProduct.category,
          sortOrder: categoryIds.size,
        })
        .returning({ id: productCategories.id });
      categoryId = category.id;
      categoryIds.set(categorySlug, categoryId);
    }

    const subcategorySlug = slugify(rawProduct.subCategory) || `subcategory-${subcategoryIds.size + 1}`;
    const subcategoryKey = `${categoryId}:${subcategorySlug}`;
    let subcategoryId = subcategoryIds.get(subcategoryKey);
    if (!subcategoryId) {
      const [subcategory] = await db
        .insert(productSubcategories)
        .values({
          categoryId,
          slug: subcategorySlug,
          name: rawProduct.subCategory,
          sortOrder: [...subcategoryIds.keys()].filter((key) => key.startsWith(`${categoryId}:`)).length,
        })
        .returning({ id: productSubcategories.id });
      subcategoryId = subcategory.id;
      subcategoryIds.set(subcategoryKey, subcategoryId);
    }

    if (!Number.isFinite(rawProduct.rating) || rawProduct.rating < 0 || rawProduct.rating > 5) {
      throw new Error(`Invalid rating for product ${rawProduct.id}: ${rawProduct.rating}`);
    }

    const [product] = await db
      .insert(products)
      .values({
        demoSiteId: site.id,
        categoryId,
        subcategoryId,
        externalId: rawProduct.id,
        slug: uniqueSlug(`${rawProduct.keyword || rawProduct.name}-${rawProduct.id}`, usedProductSlugs),
        name: rawProduct.name,
        keyword: rawProduct.keyword || null,
        description: rawProduct.desc,
        brandStory: rawProduct.brandStory || null,
        priceAmount: parsePrice(rawProduct.price),
        currencyCode: "USD",
        rating: rawProduct.rating.toFixed(1),
        reviewCount: parseReviewCount(rawProduct.reviewCount),
      })
      .returning({ id: products.id });

    productIds.set(rawProduct.id, product.id);

    await db.insert(productAssets).values({
      productId: product.id,
      assetType: "primary",
      url: rawProduct.img,
      sortOrder: 0,
      altText: `${rawProduct.name} primary image`,
    });

    if (rawProduct.descImages?.length) {
      await db.insert(productAssets).values(
        rawProduct.descImages.map((url, index) => ({
          productId: product.id,
          assetType: "description",
          url,
          sortOrder: index,
          altText: `${rawProduct.name} description image ${index + 1}`,
        })),
      );
    }

    if (rawProduct.brandImages?.length) {
      await db.insert(productAssets).values(
        rawProduct.brandImages.map((url, index) => ({
          productId: product.id,
          assetType: "brand",
          url,
          sortOrder: index,
          altText: `${rawProduct.name} brand image ${index + 1}`,
        })),
      );
    }

    if (rawProduct.features?.length) {
      await db.insert(productFeatures).values(
        rawProduct.features.map((featureText, index) => ({
          productId: product.id,
          featureText,
          sortOrder: index,
        })),
      );
    }

    const optionGroups: Array<[string, string[]]> = [
      ["size", rawProduct.sizes ?? []],
      ["color", rawProduct.colors ?? []],
    ];

    for (const [groupIndex, [name, values]] of optionGroups.entries()) {
      if (!values.length) {
        continue;
      }

      const [group] = await db
        .insert(productOptionGroups)
        .values({
          productId: product.id,
          name,
          sortOrder: groupIndex,
        })
        .returning({ id: productOptionGroups.id });

      await db.insert(productOptionValues).values(
        values.map((value, index) => ({
          optionGroupId: group.id,
          value,
          sortOrder: index,
        })),
      );
    }

    await db.insert(productRatingBreakdown).values(
      [5, 4, 3, 2, 1].map((ratingValue) => ({
        productId: product.id,
        ratingValue,
        percentage: Number(rawProduct.ratingDetail[String(ratingValue)] ?? 0),
      })),
    );
  }

  if (rawReviews.length) {
    await db.insert(productReviews).values(
      rawReviews.map((review) => {
        const productId = productIds.get(review.productId);
        if (!productId) {
          throw new Error(`Review ${review.id} references missing product ${review.productId}.`);
        }

        return {
          productId,
          externalId: review.id,
          userName: review.userName,
          rating: review.rating,
          reviewDate: review.date,
          title: review.title,
          body: review.comment,
        };
      }),
    );
  }

  const counts = await getLatestAmazonImportCounts();
  console.log(
    `Imported ${counts.products} products, ${counts.categories} categories, ${counts.subcategories} subcategories, and ${counts.reviews} reviews into amazon.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
