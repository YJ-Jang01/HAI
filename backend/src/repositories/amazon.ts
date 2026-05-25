import { and, asc, count, desc, eq, gt, ilike, inArray, ne, or } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  demoSites,
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

export type ProductRow = typeof products.$inferSelect;

function toNumber(value: string | number) {
  return Number(value);
}

function serializePrice(product: ProductRow) {
  return {
    amount: toNumber(product.priceAmount),
    currencyCode: product.currencyCode,
  };
}

export async function getAmazonSite() {
  const [site] = await db.select().from(demoSites).where(eq(demoSites.slug, "amazon")).limit(1);
  return site ?? null;
}

async function getProductTaxonomy(product: ProductRow) {
  const [row] = await db
    .select({
      category: productCategories,
      subcategory: productSubcategories,
    })
    .from(productCategories)
    .innerJoin(productSubcategories, eq(productSubcategories.id, product.subcategoryId))
    .where(eq(productCategories.id, product.categoryId))
    .limit(1);

  return {
    category: row
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
        }
      : null,
    subCategory: row
      ? {
          id: row.subcategory.id,
          slug: row.subcategory.slug,
          name: row.subcategory.name,
        }
      : null,
  };
}

async function getProductAssets(productId: string, assetTypes?: string[]) {
  const filters = [eq(productAssets.productId, productId)];
  if (assetTypes?.length) {
    filters.push(inArray(productAssets.assetType, assetTypes));
  }

  const rows = await db
    .select()
    .from(productAssets)
    .where(and(...filters))
    .orderBy(asc(productAssets.assetType), asc(productAssets.sortOrder));

  return rows.map((asset) => ({
    type: asset.assetType,
    url: asset.url,
    altText: asset.altText,
  }));
}

export async function serializeProductSummary(product: ProductRow, assetTypes: string[] = ["primary"]) {
  const [taxonomy, assets] = await Promise.all([getProductTaxonomy(product), getProductAssets(product.id, assetTypes)]);

  return {
    id: product.id,
    externalId: product.externalId,
    slug: product.slug,
    name: product.name,
    keyword: product.keyword,
    description: product.description,
    brandStory: product.brandStory,
    price: serializePrice(product),
    rating: toNumber(product.rating),
    reviewCount: product.reviewCount,
    ...taxonomy,
    assets,
  };
}

async function serializeCategory(category: typeof productCategories.$inferSelect) {
  const subcategories = await db
    .select()
    .from(productSubcategories)
    .where(eq(productSubcategories.categoryId, category.id))
    .orderBy(asc(productSubcategories.sortOrder), asc(productSubcategories.name));

  const [productCount] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.categoryId, category.id));

  const [representative] = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, category.id))
    .orderBy(asc(products.externalId))
    .limit(1);

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    productCount: productCount?.value ?? 0,
    representativeProduct: representative ? await serializeProductSummary(representative) : null,
    subCategories: subcategories.map((subcategory) => ({
      id: subcategory.id,
      slug: subcategory.slug,
      name: subcategory.name,
    })),
  };
}

export async function getAmazonCategories() {
  const site = await getAmazonSite();
  if (!site) {
    return null;
  }

  const categories = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.demoSiteId, site.id))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));

  return Promise.all(categories.map(serializeCategory));
}

export async function getAmazonHome() {
  const site = await getAmazonSite();
  if (!site) {
    return null;
  }

  return {
    demo: site.slug,
    categories: await getAmazonCategories(),
  };
}

async function findCategory(siteId: string, slug: string) {
  const [category] = await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.demoSiteId, siteId), eq(productCategories.slug, slug)))
    .limit(1);
  return category ?? null;
}

async function findSubcategory(siteId: string, slug: string, categoryId?: string) {
  const filters = [eq(productSubcategories.slug, slug), eq(productCategories.demoSiteId, siteId)];
  if (categoryId) {
    filters.push(eq(productSubcategories.categoryId, categoryId));
  }

  const [row] = await db
    .select({ subcategory: productSubcategories })
    .from(productSubcategories)
    .innerJoin(productCategories, eq(productSubcategories.categoryId, productCategories.id))
    .where(and(...filters))
    .limit(1);

  return row?.subcategory ?? null;
}

export async function searchProducts(params: {
  query?: string;
  category?: string;
  subCategory?: string;
  limit: number;
  cursor?: number;
}) {
  const site = await getAmazonSite();
  if (!site) {
    return null;
  }

  const filters = [eq(products.demoSiteId, site.id)];
  let categoryId: string | undefined;

  if (params.category) {
    const category = await findCategory(site.id, params.category);
    if (!category) {
      return { demo: site.slug, items: [], pagination: { limit: params.limit, nextCursor: null, total: 0 } };
    }
    categoryId = category.id;
    filters.push(eq(products.categoryId, category.id));
  }

  if (params.subCategory) {
    const subcategory = await findSubcategory(site.id, params.subCategory, categoryId);
    if (!subcategory) {
      return { demo: site.slug, items: [], pagination: { limit: params.limit, nextCursor: null, total: 0 } };
    }
    filters.push(eq(products.subcategoryId, subcategory.id));
  }

  if (params.query) {
    filters.push(
      or(
        ilike(products.name, `%${params.query}%`),
        ilike(products.keyword, `%${params.query}%`),
        ilike(products.description, `%${params.query}%`),
      )!,
    );
  }

  const [totalRows] = await db.select({ value: count() }).from(products).where(and(...filters));
  const pageFilters = [...filters];
  if (params.cursor !== undefined) {
    pageFilters.push(gt(products.externalId, params.cursor));
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(...pageFilters))
    .orderBy(asc(products.externalId))
    .limit(params.limit);

  return {
    demo: site.slug,
    items: await Promise.all(rows.map((row) => serializeProductSummary(row))),
    pagination: {
      limit: params.limit,
      nextCursor: rows.length === params.limit ? rows[rows.length - 1]?.externalId ?? null : null,
      total: totalRows?.value ?? 0,
    },
  };
}

export async function findProductByIdOrSlug(siteId: string, productId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
  const isExternalId = /^\d+$/.test(productId);
  const filters = [
    eq(products.demoSiteId, siteId),
    isUuid ? eq(products.id, productId) : isExternalId ? eq(products.externalId, Number(productId)) : eq(products.slug, productId),
  ];

  const [product] = await db.select().from(products).where(and(...filters)).limit(1);
  return product ?? null;
}

async function getProductFeatures(productId: string) {
  const rows = await db
    .select()
    .from(productFeatures)
    .where(eq(productFeatures.productId, productId))
    .orderBy(asc(productFeatures.sortOrder));

  return rows.map((feature) => ({
    id: feature.id,
    text: feature.featureText,
  }));
}

async function getProductOptions(productId: string) {
  const groups = await db
    .select()
    .from(productOptionGroups)
    .where(eq(productOptionGroups.productId, productId))
    .orderBy(asc(productOptionGroups.sortOrder));

  return Promise.all(
    groups.map(async (group) => {
      const values = await db
        .select()
        .from(productOptionValues)
        .where(eq(productOptionValues.optionGroupId, group.id))
        .orderBy(asc(productOptionValues.sortOrder));

      return {
        id: group.id,
        name: group.name,
        values: values.map((value) => value.value),
      };
    }),
  );
}

async function getProductRatingBreakdown(productId: string) {
  const rows = await db
    .select()
    .from(productRatingBreakdown)
    .where(eq(productRatingBreakdown.productId, productId))
    .orderBy(desc(productRatingBreakdown.ratingValue));

  return rows.map((row) => ({
    ratingValue: row.ratingValue,
    percentage: row.percentage,
  }));
}

async function getProductReviews(productId: string, limit: number) {
  const rows = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.productId, productId))
    .orderBy(desc(productReviews.reviewDate), asc(productReviews.externalId))
    .limit(limit);

  return rows.map((review) => ({
    id: review.id,
    externalId: review.externalId,
    userName: review.userName,
    rating: review.rating,
    date: review.reviewDate,
    title: review.title,
    comment: review.body,
  }));
}

async function getRelatedProducts(product: ProductRow) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.demoSiteId, product.demoSiteId), eq(products.categoryId, product.categoryId), ne(products.id, product.id)))
    .orderBy(asc(products.externalId))
    .limit(5);

  return Promise.all(rows.map((row) => serializeProductSummary(row)));
}

export async function serializeProductDetail(product: ProductRow) {
  const [summary, assets, features, options, ratingBreakdown, reviews, relatedProducts] = await Promise.all([
    serializeProductSummary(product, ["primary", "description", "brand"]),
    getProductAssets(product.id),
    getProductFeatures(product.id),
    getProductOptions(product.id),
    getProductRatingBreakdown(product.id),
    getProductReviews(product.id, 20),
    getRelatedProducts(product),
  ]);

  return {
    ...summary,
    assets,
    features,
    options,
    ratingBreakdown,
    reviews,
    relatedProducts,
  };
}

export async function clearAmazonCatalog(siteId: string) {
  await db.delete(products).where(eq(products.demoSiteId, siteId));
  await db.delete(productCategories).where(eq(productCategories.demoSiteId, siteId));
}

export async function getOrCreateAmazonSite() {
  const [site] = await db
    .insert(demoSites)
    .values({ slug: "amazon", displayName: "AIMAZON" })
    .onConflictDoUpdate({
      target: demoSites.slug,
      set: { displayName: "AIMAZON" },
    })
    .returning();

  return site;
}

export async function getLatestAmazonImportCounts() {
  const site = await getAmazonSite();
  if (!site) {
    return { products: 0, categories: 0, subcategories: 0, reviews: 0 };
  }

  const [productCount] = await db.select({ value: count() }).from(products).where(eq(products.demoSiteId, site.id));
  const [categoryCount] = await db.select({ value: count() }).from(productCategories).where(eq(productCategories.demoSiteId, site.id));
  const [subcategoryCount] = await db
    .select({ value: count(productSubcategories.id) })
    .from(productSubcategories)
    .innerJoin(productCategories, eq(productSubcategories.categoryId, productCategories.id))
    .where(eq(productCategories.demoSiteId, site.id));
  const [reviewCount] = await db
    .select({ value: count(productReviews.id) })
    .from(productReviews)
    .innerJoin(products, eq(productReviews.productId, products.id))
    .where(eq(products.demoSiteId, site.id));

  return {
    products: productCount?.value ?? 0,
    categories: categoryCount?.value ?? 0,
    subcategories: subcategoryCount?.value ?? 0,
    reviews: reviewCount?.value ?? 0,
  };
}
