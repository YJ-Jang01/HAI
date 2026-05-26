import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { db, pool } from "../db/client.js";
import {
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
  attributes?: Record<string, unknown>;
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

type RawAttributeDefinition = {
  key: string;
  label: string;
  dataType: "text" | "number" | "boolean" | "enum";
  unit?: string;
  minValue?: number;
  maxValue?: number;
  description: string;
  isFilterable: boolean;
  isRangeFacet: boolean;
  options?: Array<{
    value: string;
    label: string;
  }>;
};

type RawReviewEvidence = {
  id: number;
  reviewId: number;
  productId: number;
  attributeKey: string;
  sentiment: "positive" | "neutral" | "negative";
  evidenceText: string;
  source?: string;
  humanReviewStatus?: "generated" | "reviewed" | "approved";
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
      attributes: candidate.attributes && typeof candidate.attributes === "object" ? candidate.attributes : {},
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

function validateAttributeTaxonomy(value: unknown): RawAttributeDefinition[] {
  if (!Array.isArray(value)) {
    throw new Error("Amazon attribute taxonomy must be a JSON array.");
  }

  const keys = new Set<string>();
  const dataTypes = new Set(["text", "number", "boolean", "enum"]);
  return value.map((item, index) => {
    const candidate = item as Partial<RawAttributeDefinition>;
    const key = requireString(candidate.key, "key", index);
    if (keys.has(key)) {
      throw new Error(`Duplicate attribute key: ${key}`);
    }
    keys.add(key);
    if (!dataTypes.has(String(candidate.dataType))) {
      throw new Error(`Attribute ${key} has invalid dataType.`);
    }
    if (candidate.dataType === "enum" && (!Array.isArray(candidate.options) || candidate.options.length === 0)) {
      throw new Error(`Enum attribute ${key} must define options.`);
    }

    return {
      key,
      label: requireString(candidate.label, "label", index),
      dataType: candidate.dataType as RawAttributeDefinition["dataType"],
      unit: typeof candidate.unit === "string" ? candidate.unit.trim() : undefined,
      minValue: candidate.minValue === undefined ? undefined : Number(candidate.minValue),
      maxValue: candidate.maxValue === undefined ? undefined : Number(candidate.maxValue),
      description: requireString(candidate.description, "description", index),
      isFilterable: candidate.isFilterable !== false,
      isRangeFacet: candidate.isRangeFacet === true,
      options: Array.isArray(candidate.options)
        ? candidate.options.map((option, optionIndex) => ({
            value: requireString(option.value, `options[${optionIndex}].value`, index),
            label: requireString(option.label, `options[${optionIndex}].label`, index),
          }))
        : [],
    };
  });
}

function validateProductAttributes(rawProducts: RawProduct[], definitions: RawAttributeDefinition[]) {
  const optionValues = new Map(definitions.map((definition) => [definition.key, new Set((definition.options ?? []).map((option) => option.value))]));

  for (const product of rawProducts) {
    const attributes = product.attributes ?? {};
    for (const definition of definitions) {
      if (!(definition.key in attributes)) {
        throw new Error(`Product ${product.id} is missing attribute ${definition.key}.`);
      }

      const value = attributes[definition.key];
      if (definition.dataType === "enum") {
        if (typeof value !== "string" || !optionValues.get(definition.key)?.has(value)) {
          throw new Error(`Product ${product.id} has invalid enum ${definition.key}: ${String(value)}`);
        }
      } else if (definition.dataType === "number") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          throw new Error(`Product ${product.id} has invalid number ${definition.key}: ${String(value)}`);
        }
        if (definition.minValue !== undefined && parsed < definition.minValue) {
          throw new Error(`Product ${product.id} has ${definition.key} below minValue.`);
        }
        if (definition.maxValue !== undefined && parsed > definition.maxValue) {
          throw new Error(`Product ${product.id} has ${definition.key} above maxValue.`);
        }
      } else if (definition.dataType === "boolean" && typeof value !== "boolean") {
        throw new Error(`Product ${product.id} has invalid boolean ${definition.key}: ${String(value)}`);
      } else if (definition.dataType === "text" && typeof value !== "string") {
        throw new Error(`Product ${product.id} has invalid text ${definition.key}: ${String(value)}`);
      }
    }
  }
}

function validateReviewEvidence(value: unknown, reviewIds: Set<number>, productIds: Set<number>, attributeKeys: Set<string>): RawReviewEvidence[] {
  if (!Array.isArray(value)) {
    throw new Error("Amazon review evidence data must be a JSON array.");
  }

  const ids = new Set<number>();
  const sentiments = new Set(["positive", "neutral", "negative"]);
  const statuses = new Set(["generated", "reviewed", "approved"]);
  return value.map((item, index) => {
    const candidate = item as Partial<RawReviewEvidence>;
    const id = Number(candidate.id);
    const reviewId = Number(candidate.reviewId);
    const productId = Number(candidate.productId);
    const sentiment = String(candidate.sentiment);
    const status = candidate.humanReviewStatus ?? "generated";

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Evidence at index ${index} has an invalid id.`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate evidence id: ${id}`);
    }
    ids.add(id);
    if (!reviewIds.has(reviewId)) {
      throw new Error(`Evidence ${id} references missing review ${reviewId}.`);
    }
    if (!productIds.has(productId)) {
      throw new Error(`Evidence ${id} references missing product ${productId}.`);
    }
    if (!attributeKeys.has(String(candidate.attributeKey))) {
      throw new Error(`Evidence ${id} references missing attribute ${String(candidate.attributeKey)}.`);
    }
    if (!sentiments.has(sentiment)) {
      throw new Error(`Evidence ${id} has invalid sentiment ${sentiment}.`);
    }
    if (!statuses.has(status)) {
      throw new Error(`Evidence ${id} has invalid humanReviewStatus ${status}.`);
    }

    return {
      id,
      reviewId,
      productId,
      attributeKey: requireString(candidate.attributeKey, "attributeKey", index),
      sentiment: sentiment as RawReviewEvidence["sentiment"],
      evidenceText: requireString(candidate.evidenceText, "evidenceText", index),
      source: typeof candidate.source === "string" ? candidate.source.trim() : "generated",
      humanReviewStatus: status,
    };
  });
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../..");
  const productsPath = resolve(repoRoot, "frontend/Amazon/products.json");
  const reviewsPath = resolve(repoRoot, "frontend/Amazon/review.json");
  const taxonomyPath = resolve(repoRoot, "frontend/Amazon/attribute_taxonomy.json");
  const evidencePath = resolve(repoRoot, "frontend/Amazon/review_evidence.json");

  const rawProducts = validateProducts(JSON.parse(await readFile(productsPath, "utf-8")));
  const rawTaxonomy = validateAttributeTaxonomy(JSON.parse(await readFile(taxonomyPath, "utf-8")));
  validateProductAttributes(rawProducts, rawTaxonomy);
  const rawReviews = validateReviews(
    JSON.parse(await readFile(reviewsPath, "utf-8")),
    new Set(rawProducts.map((product) => product.id)),
  );
  const rawEvidence = validateReviewEvidence(
    JSON.parse(await readFile(evidencePath, "utf-8")),
    new Set(rawReviews.map((review) => review.id)),
    new Set(rawProducts.map((product) => product.id)),
    new Set(rawTaxonomy.map((definition) => definition.key)),
  );

  const site = await getOrCreateAmazonSite();
  await clearAmazonCatalog(site.id);

  const categoryIds = new Map<string, string>();
  const subcategoryIds = new Map<string, string>();
  const productIds = new Map<number, string>();
  const attributeDefinitions = new Map<string, { id: string; dataType: RawAttributeDefinition["dataType"] }>();
  const attributeOptions = new Map<string, string>();
  const usedProductSlugs = new Set<string>();

  for (const [definitionIndex, rawDefinition] of rawTaxonomy.entries()) {
    const [definition] = await db
      .insert(productAttributeDefinitions)
      .values({
        demoSiteId: site.id,
        key: rawDefinition.key,
        label: rawDefinition.label,
        dataType: rawDefinition.dataType,
        unit: rawDefinition.unit || null,
        minValue: rawDefinition.minValue === undefined ? null : rawDefinition.minValue.toFixed(2),
        maxValue: rawDefinition.maxValue === undefined ? null : rawDefinition.maxValue.toFixed(2),
        description: rawDefinition.description,
        isFilterable: rawDefinition.isFilterable,
        isRangeFacet: rawDefinition.isRangeFacet,
        sortOrder: definitionIndex,
      })
      .returning({ id: productAttributeDefinitions.id });

    attributeDefinitions.set(rawDefinition.key, { id: definition.id, dataType: rawDefinition.dataType });

    if (rawDefinition.options?.length) {
      const insertedOptions = await db
        .insert(productAttributeOptions)
        .values(
          rawDefinition.options.map((option, optionIndex) => ({
            attributeDefinitionId: definition.id,
            value: option.value,
            label: option.label,
            sortOrder: optionIndex,
          })),
        )
        .returning({ id: productAttributeOptions.id, value: productAttributeOptions.value });

      for (const option of insertedOptions) {
        attributeOptions.set(`${rawDefinition.key}:${option.value}`, option.id);
      }
    }
  }

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

    const attributeValues = rawTaxonomy.map((definition) => {
      const definitionRow = attributeDefinitions.get(definition.key);
      if (!definitionRow) {
        throw new Error(`Missing inserted attribute definition ${definition.key}.`);
      }
      const value = rawProduct.attributes?.[definition.key];
      const base = {
        productId: product.id,
        attributeDefinitionId: definitionRow.id,
        source: "generated",
        humanReviewStatus: "generated",
      };

      if (definition.dataType === "enum") {
        const optionId = attributeOptions.get(`${definition.key}:${String(value)}`);
        if (!optionId) {
          throw new Error(`Missing option ${definition.key}:${String(value)}.`);
        }
        return { ...base, optionId };
      }
      if (definition.dataType === "number") {
        return { ...base, valueNumber: Number(value).toFixed(2) };
      }
      if (definition.dataType === "boolean") {
        return { ...base, valueBoolean: Boolean(value) };
      }
      return { ...base, valueText: String(value) };
    });

    await db.insert(productAttributeValues).values(attributeValues);

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

  const reviewIds = new Map<number, string>();
  if (rawReviews.length) {
    const insertedReviews = await db.insert(productReviews).values(
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
    ).returning({ id: productReviews.id, externalId: productReviews.externalId });

    for (const review of insertedReviews) {
      reviewIds.set(review.externalId, review.id);
    }
  }

  if (rawEvidence.length) {
    await db.insert(productReviewEvidence).values(
      rawEvidence.map((evidence) => {
        const reviewId = reviewIds.get(evidence.reviewId);
        const definition = attributeDefinitions.get(evidence.attributeKey);
        if (!reviewId) {
          throw new Error(`Evidence ${evidence.id} references missing inserted review ${evidence.reviewId}.`);
        }
        if (!definition) {
          throw new Error(`Evidence ${evidence.id} references missing inserted attribute ${evidence.attributeKey}.`);
        }

        return {
          reviewId,
          attributeDefinitionId: definition.id,
          sentiment: evidence.sentiment,
          evidenceText: evidence.evidenceText,
          source: evidence.source || "generated",
          humanReviewStatus: evidence.humanReviewStatus || "generated",
        };
      }),
    );
  }

  const counts = await getLatestAmazonImportCounts();
  console.log(
    `Imported ${counts.products} products, ${counts.categories} categories, ${counts.subcategories} subcategories, ${counts.reviews} reviews, ${counts.attributes} attributes, and ${counts.evidence} evidence rows into amazon.`,
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
