import { and, asc, count, desc, eq, gt, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  demoSites,
  productAssets,
  productAttributeDefinitions,
  productAttributeOptions,
  productAttributeValues,
  productCategories,
  productFeatures,
  productOptionGroups,
  productOptionValues,
  productRatingBreakdown,
  productReviewEvidence,
  productReviews,
  products,
  productSubcategories,
} from "../db/schema.js";

export type ProductRow = typeof products.$inferSelect;
export type ProductSort = "external_id_asc" | "price_asc" | "price_desc" | "rating_desc" | "review_count_desc";

export type ProductFilterParams = {
  query?: string;
  category?: string;
  subCategory?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  reviewCountMin?: number;
  reviewCountMax?: number;
  attributeFilters?: AttributeFilter[];
};

export type AttributeFilter = {
  key: string;
  min?: number;
  max?: number;
  value?: string | number | boolean;
};

export type ProductSearchParams = ProductFilterParams & {
  limit: number;
  cursor?: number;
  sort: ProductSort;
};

function toNumber(value: string | number) {
  return Number(value);
}

function serializePrice(product: ProductRow) {
  return {
    amount: toNumber(product.priceAmount),
    currencyCode: product.currencyCode,
  };
}

function nullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundNullable(value: string | number | null | undefined, digits = 2) {
  const parsed = nullableNumber(value);
  if (parsed === null) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(parsed * factor) / factor;
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

function serializeAttributeValue(row: {
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  optionValue: string | null;
}) {
  if (row.optionValue !== null) {
    return row.optionValue;
  }
  if (row.valueNumber !== null) {
    return toNumber(row.valueNumber);
  }
  if (row.valueBoolean !== null) {
    return row.valueBoolean;
  }
  return row.valueText;
}

async function getProductAttributes(productId: string) {
  const rows = await db
    .select({
      key: productAttributeDefinitions.key,
      label: productAttributeDefinitions.label,
      dataType: productAttributeDefinitions.dataType,
      unit: productAttributeDefinitions.unit,
      valueText: productAttributeValues.valueText,
      valueNumber: productAttributeValues.valueNumber,
      valueBoolean: productAttributeValues.valueBoolean,
      optionValue: productAttributeOptions.value,
      optionLabel: productAttributeOptions.label,
      source: productAttributeValues.source,
      humanReviewStatus: productAttributeValues.humanReviewStatus,
      sortOrder: productAttributeDefinitions.sortOrder,
    })
    .from(productAttributeValues)
    .innerJoin(productAttributeDefinitions, eq(productAttributeValues.attributeDefinitionId, productAttributeDefinitions.id))
    .leftJoin(productAttributeOptions, eq(productAttributeValues.optionId, productAttributeOptions.id))
    .where(eq(productAttributeValues.productId, productId))
    .orderBy(asc(productAttributeDefinitions.sortOrder));

  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    dataType: row.dataType,
    unit: row.unit,
    value: serializeAttributeValue(row),
    displayValue: row.optionLabel ?? serializeAttributeValue(row),
    source: row.source,
    humanReviewStatus: row.humanReviewStatus,
  }));
}

export async function serializeProductSummary(product: ProductRow, assetTypes: string[] = ["primary"]) {
  const [taxonomy, assets, attributes] = await Promise.all([getProductTaxonomy(product), getProductAssets(product.id, assetTypes), getProductAttributes(product.id)]);

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
    attributes,
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

async function buildProductFilters(site: typeof demoSites.$inferSelect, params: ProductFilterParams) {
  const filters: SQL[] = [eq(products.demoSiteId, site.id)];
  let categoryId: string | undefined;

  if (params.category) {
    const category = await findCategory(site.id, params.category);
    if (!category) {
      return { filters, empty: true };
    }
    categoryId = category.id;
    filters.push(eq(products.categoryId, category.id));
  }

  if (params.subCategory) {
    const subcategory = await findSubcategory(site.id, params.subCategory, categoryId);
    if (!subcategory) {
      return { filters, empty: true };
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

  if (params.priceMin !== undefined) {
    filters.push(gte(products.priceAmount, String(params.priceMin)));
  }
  if (params.priceMax !== undefined) {
    filters.push(lte(products.priceAmount, String(params.priceMax)));
  }
  if (params.ratingMin !== undefined) {
    filters.push(gte(products.rating, String(params.ratingMin)));
  }
  if (params.ratingMax !== undefined) {
    filters.push(lte(products.rating, String(params.ratingMax)));
  }
  if (params.reviewCountMin !== undefined) {
    filters.push(gte(products.reviewCount, params.reviewCountMin));
  }
  if (params.reviewCountMax !== undefined) {
    filters.push(lte(products.reviewCount, params.reviewCountMax));
  }

  for (const attributeFilter of params.attributeFilters ?? []) {
    const clauses: SQL[] = [
      sql`${productAttributeValues.productId} = ${products.id}`,
      sql`${productAttributeDefinitions.id} = ${productAttributeValues.attributeDefinitionId}`,
      sql`${productAttributeDefinitions.demoSiteId} = ${site.id}`,
      sql`${productAttributeDefinitions.key} = ${attributeFilter.key}`,
    ];

    if (attributeFilter.min !== undefined) {
      clauses.push(sql`${productAttributeValues.valueNumber} >= ${attributeFilter.min.toFixed(2)}`);
    }
    if (attributeFilter.max !== undefined) {
      clauses.push(sql`${productAttributeValues.valueNumber} <= ${attributeFilter.max.toFixed(2)}`);
    }
    if (attributeFilter.value !== undefined) {
      if (typeof attributeFilter.value === "boolean") {
        clauses.push(sql`${productAttributeValues.valueBoolean} = ${attributeFilter.value}`);
      } else if (typeof attributeFilter.value === "number") {
        clauses.push(sql`${productAttributeValues.valueNumber} = ${attributeFilter.value.toFixed(2)}`);
      } else {
        clauses.push(sql`(${productAttributeValues.valueText} = ${attributeFilter.value} or exists (
          select 1 from ${productAttributeOptions}
          where ${productAttributeOptions.id} = ${productAttributeValues.optionId}
          and ${productAttributeOptions.value} = ${attributeFilter.value}
        ))`);
      }
    }

    filters.push(sql`exists (
      select 1 from ${productAttributeValues}, ${productAttributeDefinitions}
      where ${sql.join(clauses, sql` and `)}
    )`);
  }

  return { filters, empty: false };
}

function getProductOrder(sort: ProductSort): SQL[] {
  if (sort === "price_asc") {
    return [asc(products.priceAmount), asc(products.externalId)];
  }
  if (sort === "price_desc") {
    return [desc(products.priceAmount), asc(products.externalId)];
  }
  if (sort === "rating_desc") {
    return [desc(products.rating), desc(products.reviewCount), asc(products.externalId)];
  }
  if (sort === "review_count_desc") {
    return [desc(products.reviewCount), desc(products.rating), asc(products.externalId)];
  }
  return [asc(products.externalId)];
}

function percentile(sortedValues: number[], value: number) {
  if (!sortedValues.length) {
    return null;
  }
  const index = (sortedValues.length - 1) * value;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sortedValues[lower] ?? null;
  }
  const lowerValue = sortedValues[lower] ?? 0;
  const upperValue = sortedValues[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

async function getAttributeFacets(productIds: string[]) {
  if (!productIds.length) {
    return {};
  }

  const rows = await db
    .select({
      key: productAttributeDefinitions.key,
      label: productAttributeDefinitions.label,
      dataType: productAttributeDefinitions.dataType,
      unit: productAttributeDefinitions.unit,
      valueText: productAttributeValues.valueText,
      valueNumber: productAttributeValues.valueNumber,
      valueBoolean: productAttributeValues.valueBoolean,
      optionValue: productAttributeOptions.value,
      optionLabel: productAttributeOptions.label,
      sortOrder: productAttributeDefinitions.sortOrder,
    })
    .from(productAttributeValues)
    .innerJoin(productAttributeDefinitions, eq(productAttributeValues.attributeDefinitionId, productAttributeDefinitions.id))
    .leftJoin(productAttributeOptions, eq(productAttributeValues.optionId, productAttributeOptions.id))
    .where(inArray(productAttributeValues.productId, productIds))
    .orderBy(asc(productAttributeDefinitions.sortOrder), asc(productAttributeOptions.sortOrder));

  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      dataType: string;
      unit: string | null;
      values: number[];
      counts: Map<string, { value: string | boolean; label: string; count: number }>;
      sortOrder: number;
    }
  >();

  for (const row of rows) {
    const group =
      groups.get(row.key) ??
      {
        key: row.key,
        label: row.label,
        dataType: row.dataType,
        unit: row.unit,
        values: [],
        counts: new Map<string, { value: string | boolean; label: string; count: number }>(),
        sortOrder: row.sortOrder,
      };

    if (row.dataType === "number" && row.valueNumber !== null) {
      group.values.push(Number(row.valueNumber));
    } else if (row.dataType === "boolean" && row.valueBoolean !== null) {
      const countKey = String(row.valueBoolean);
      const existing = group.counts.get(countKey);
      group.counts.set(countKey, {
        value: row.valueBoolean,
        label: row.valueBoolean ? "true" : "false",
        count: (existing?.count ?? 0) + 1,
      });
    } else {
      const value = row.optionValue ?? row.valueText;
      if (value !== null) {
        const existing = group.counts.get(value);
        group.counts.set(value, {
          value,
          label: row.optionLabel ?? value,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    groups.set(row.key, group);
  }

  return Object.fromEntries(
    [...groups.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => {
        if (group.dataType === "number") {
          const values = [...group.values].sort((a, b) => a - b);
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          return [
            group.key,
            {
              key: group.key,
              label: group.label,
              dataType: group.dataType,
              unit: group.unit,
              min: roundNullable(values[0]),
              max: roundNullable(values[values.length - 1]),
              average: roundNullable(average),
              median: roundNullable(percentile(values, 0.5)),
              p40: roundNullable(percentile(values, 0.4)),
              p70: roundNullable(percentile(values, 0.7)),
            },
          ];
        }

        return [
          group.key,
          {
            key: group.key,
            label: group.label,
            dataType: group.dataType,
            values: [...group.counts.values()].sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value))),
          },
        ];
      }),
  );
}

export async function searchProducts(params: ProductSearchParams) {
  const site = await getAmazonSite();
  if (!site) {
    return null;
  }

  const { filters, empty } = await buildProductFilters(site, params);
  if (empty) {
    return { demo: site.slug, items: [], sort: params.sort, pagination: { limit: params.limit, nextCursor: null, total: 0 } };
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
    .orderBy(...getProductOrder(params.sort))
    .limit(params.limit);

  return {
    demo: site.slug,
    items: await Promise.all(rows.map((row) => serializeProductSummary(row))),
    sort: params.sort,
    pagination: {
      limit: params.limit,
      nextCursor: params.sort === "external_id_asc" && rows.length === params.limit ? rows[rows.length - 1]?.externalId ?? null : null,
      total: totalRows?.value ?? 0,
    },
  };
}

export async function getProductFacets(params: ProductFilterParams) {
  const site = await getAmazonSite();
  if (!site) {
    return null;
  }

  const { filters, empty } = await buildProductFilters(site, params);
  if (empty) {
    return {
      demo: site.slug,
      total: 0,
      ranges: {
        price: null,
        rating: null,
        reviewCount: null,
      },
      attributes: {},
      interpretationBasis: {
        notTooExpensive: null,
        goodReviews: null,
      },
    };
  }

  const [row] = await db
    .select({
      total: count(),
      minPrice: sql<string | null>`min(${products.priceAmount})`,
      maxPrice: sql<string | null>`max(${products.priceAmount})`,
      avgPrice: sql<string | null>`avg(${products.priceAmount})`,
      medianPrice: sql<string | null>`percentile_cont(0.5) within group (order by ${products.priceAmount})`,
      p40Price: sql<string | null>`percentile_cont(0.4) within group (order by ${products.priceAmount})`,
      minRating: sql<string | null>`min(${products.rating})`,
      maxRating: sql<string | null>`max(${products.rating})`,
      avgRating: sql<string | null>`avg(${products.rating})`,
      medianRating: sql<string | null>`percentile_cont(0.5) within group (order by ${products.rating})`,
      p70Rating: sql<string | null>`percentile_cont(0.7) within group (order by ${products.rating})`,
      minReviewCount: sql<number | null>`min(${products.reviewCount})`,
      maxReviewCount: sql<number | null>`max(${products.reviewCount})`,
      avgReviewCount: sql<string | null>`avg(${products.reviewCount})`,
      medianReviewCount: sql<string | null>`percentile_cont(0.5) within group (order by ${products.reviewCount})`,
      p70ReviewCount: sql<string | null>`percentile_cont(0.7) within group (order by ${products.reviewCount})`,
    })
    .from(products)
    .where(and(...filters));

  const total = row?.total ?? 0;
  const matchedProducts =
    total > 0
      ? await db
          .select({ id: products.id })
          .from(products)
          .where(and(...filters))
      : [];
  const attributeFacets = await getAttributeFacets(matchedProducts.map((product) => product.id));
  const p40Price = roundNullable(row?.p40Price);
  const p70Rating = roundNullable(row?.p70Rating, 1);
  const p70ReviewCount = roundNullable(row?.p70ReviewCount, 0);

  return {
    demo: site.slug,
    total,
    ranges: {
      price:
        total > 0
          ? {
              min: roundNullable(row?.minPrice),
              max: roundNullable(row?.maxPrice),
              average: roundNullable(row?.avgPrice),
              median: roundNullable(row?.medianPrice),
              p40: p40Price,
              currencyCode: "USD",
            }
          : null,
      rating:
        total > 0
          ? {
              min: roundNullable(row?.minRating, 1),
              max: roundNullable(row?.maxRating, 1),
              average: roundNullable(row?.avgRating, 2),
              median: roundNullable(row?.medianRating, 1),
              p70: p70Rating,
            }
          : null,
      reviewCount:
        total > 0
          ? {
              min: nullableNumber(row?.minReviewCount),
              max: nullableNumber(row?.maxReviewCount),
              average: roundNullable(row?.avgReviewCount, 1),
              median: roundNullable(row?.medianReviewCount, 0),
              p70: p70ReviewCount,
            }
          : null,
    },
    attributes: attributeFacets,
    interpretationBasis: {
      notTooExpensive: p40Price === null ? null : { field: "price.amount", operator: "<=", value: p40Price, basis: "40th percentile of matched products" },
      goodReviews:
        p70Rating === null && p70ReviewCount === null
          ? null
          : {
              rating: p70Rating === null ? null : { field: "rating", operator: ">=", value: p70Rating, basis: "70th percentile of matched products" },
              reviewCount:
                p70ReviewCount === null ? null : { field: "reviewCount", operator: ">=", value: p70ReviewCount, basis: "70th percentile of matched products" },
            },
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

async function getProductReviewEvidence(productId: string) {
  const rows = await db
    .select({
      reviewId: productReviews.id,
      reviewExternalId: productReviews.externalId,
      attributeKey: productAttributeDefinitions.key,
      attributeLabel: productAttributeDefinitions.label,
      sentiment: productReviewEvidence.sentiment,
      evidenceText: productReviewEvidence.evidenceText,
      source: productReviewEvidence.source,
      humanReviewStatus: productReviewEvidence.humanReviewStatus,
    })
    .from(productReviewEvidence)
    .innerJoin(productReviews, eq(productReviewEvidence.reviewId, productReviews.id))
    .innerJoin(productAttributeDefinitions, eq(productReviewEvidence.attributeDefinitionId, productAttributeDefinitions.id))
    .where(eq(productReviews.productId, productId))
    .orderBy(asc(productReviews.externalId), asc(productAttributeDefinitions.sortOrder));

  return rows.map((row) => ({
    reviewId: row.reviewId,
    reviewExternalId: row.reviewExternalId,
    attributeKey: row.attributeKey,
    attributeLabel: row.attributeLabel,
    sentiment: row.sentiment,
    evidenceText: row.evidenceText,
    source: row.source,
    humanReviewStatus: row.humanReviewStatus,
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
  const [summary, assets, features, options, ratingBreakdown, reviews, reviewEvidence, relatedProducts] = await Promise.all([
    serializeProductSummary(product, ["primary", "description", "brand"]),
    getProductAssets(product.id),
    getProductFeatures(product.id),
    getProductOptions(product.id),
    getProductRatingBreakdown(product.id),
    getProductReviews(product.id, 20),
    getProductReviewEvidence(product.id),
    getRelatedProducts(product),
  ]);

  return {
    ...summary,
    assets,
    features,
    options,
    ratingBreakdown,
    reviews,
    reviewEvidence,
    relatedProducts,
  };
}

export async function clearAmazonCatalog(siteId: string) {
  await db.delete(products).where(eq(products.demoSiteId, siteId));
  await db.delete(productCategories).where(eq(productCategories.demoSiteId, siteId));
  await db.delete(productAttributeDefinitions).where(eq(productAttributeDefinitions.demoSiteId, siteId));
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
    return { products: 0, categories: 0, subcategories: 0, reviews: 0, attributes: 0, evidence: 0 };
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
  const [attributeCount] = await db.select({ value: count(productAttributeDefinitions.id) }).from(productAttributeDefinitions).where(eq(productAttributeDefinitions.demoSiteId, site.id));
  const [evidenceCount] = await db
    .select({ value: count(productReviewEvidence.id) })
    .from(productReviewEvidence)
    .innerJoin(productReviews, eq(productReviewEvidence.reviewId, productReviews.id))
    .innerJoin(products, eq(productReviews.productId, products.id))
    .where(eq(products.demoSiteId, site.id));

  return {
    products: productCount?.value ?? 0,
    categories: categoryCount?.value ?? 0,
    subcategories: subcategoryCount?.value ?? 0,
    reviews: reviewCount?.value ?? 0,
    attributes: attributeCount?.value ?? 0,
    evidence: evidenceCount?.value ?? 0,
  };
}
