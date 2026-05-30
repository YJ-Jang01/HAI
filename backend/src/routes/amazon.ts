import { Router } from "express";

import { parseNonNegativeInteger, sendError } from "../lib/http.js";
import {
  findProductByIdOrSlug,
  getAmazonCategories,
  getAmazonHome,
  getAmazonSite,
  getProductFacets,
  searchProducts,
  serializeProductDetail,
  type AttributeFilter,
  type ProductFilterParams,
  type ProductSort,
} from "../repositories/amazon.js";

export const amazonRouter = Router();

const productSorts: ProductSort[] = ["external_id_asc", "price_asc", "price_desc", "rating_desc", "review_count_desc"];

function readString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalNonNegativeNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseOptionalNonNegativeInteger(value: unknown) {
  const parsed = parseOptionalNonNegativeNumber(value);
  if (parsed === undefined || parsed === null) {
    return parsed;
  }
  return Number.isInteger(parsed) ? parsed : null;
}

function parseSort(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "external_id_asc" satisfies ProductSort;
  }
  if (typeof value !== "string" || !productSorts.includes(value as ProductSort)) {
    return null;
  }
  return value as ProductSort;
}

function parseAttributeFilterValue(value: unknown) {
  const raw = readString(value);
  if (raw === undefined) {
    return null;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function parseAttributeFilters(query: Record<string, unknown>) {
  const filters = new Map<string, AttributeFilter>();

  for (const [name, value] of Object.entries(query)) {
    if (!name.startsWith("attribute.")) {
      continue;
    }

    const rawName = name.slice("attribute.".length);
    if (!rawName) {
      return null;
    }

    const isMin = rawName.endsWith("Min");
    const isMax = rawName.endsWith("Max");
    const key = isMin || isMax ? rawName.slice(0, -3) : rawName;
    if (!key) {
      return null;
    }

    const current = filters.get(key) ?? { key };
    if (isMin || isMax) {
      const parsed = parseOptionalNonNegativeNumber(value);
      if (parsed === null || parsed === undefined) {
        return null;
      }
      if (isMin) {
        current.min = parsed;
      } else {
        current.max = parsed;
      }
    } else {
      const parsed = parseAttributeFilterValue(value);
      if (parsed === null) {
        return null;
      }
      current.value = parsed;
    }
    if (current.min !== undefined && current.max !== undefined && current.min > current.max) {
      return null;
    }
    filters.set(key, current);
  }

  return [...filters.values()];
}

function parseProductFilters(query: Record<string, unknown>) {
  const priceMin = parseOptionalNonNegativeNumber(query.priceMin);
  const priceMax = parseOptionalNonNegativeNumber(query.priceMax);
  const ratingMin = parseOptionalNonNegativeNumber(query.ratingMin);
  const ratingMax = parseOptionalNonNegativeNumber(query.ratingMax);
  const reviewCountMin = parseOptionalNonNegativeInteger(query.reviewCountMin);
  const reviewCountMax = parseOptionalNonNegativeInteger(query.reviewCountMax);
  const attributeFilters = parseAttributeFilters(query);

  if (
    priceMin === null ||
    priceMax === null ||
    ratingMin === null ||
    ratingMax === null ||
    reviewCountMin === null ||
    reviewCountMax === null ||
    attributeFilters === null
  ) {
    return null;
  }
  if ((ratingMin !== undefined && ratingMin > 5) || (ratingMax !== undefined && ratingMax > 5)) {
    return null;
  }
  if ((priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) || (ratingMin !== undefined && ratingMax !== undefined && ratingMin > ratingMax)) {
    return null;
  }
  if (reviewCountMin !== undefined && reviewCountMax !== undefined && reviewCountMin > reviewCountMax) {
    return null;
  }

  return {
    query: readString(query.query),
    category: readString(query.category),
    subCategory: readString(query.subCategory),
    priceMin,
    priceMax,
    ratingMin,
    ratingMax,
    reviewCountMin,
    reviewCountMax,
    attributeFilters,
  } satisfies ProductFilterParams;
}

amazonRouter.get("/home", async (_req, res, next) => {
  try {
    const home = await getAmazonHome();
    if (!home) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Amazon demo data has not been loaded.");
    }

    return res.json(home);
  } catch (error) {
    return next(error);
  }
});

amazonRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await getAmazonCategories();
    if (!categories) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Amazon demo data has not been loaded.");
    }

    return res.json({ demo: "amazon", categories });
  } catch (error) {
    return next(error);
  }
});

amazonRouter.get("/products", async (req, res, next) => {
  try {
    const limit = parseNonNegativeInteger(req.query.limit, 24, 100);
    const cursor = parseNonNegativeInteger(req.query.cursor, Number.NaN, 1000000);
    const filters = parseProductFilters(req.query);
    const sort = parseSort(req.query.sort);

    if (limit === null || cursor === null || !filters || !sort) {
      return sendError(
        res,
        400,
        "INVALID_REQUEST",
        "limit, cursor, range filters, attribute filters, and sort must use valid values. ratingMin/ratingMax must be between 0 and 5.",
      );
    }

    if (!Number.isNaN(cursor) && sort !== "external_id_asc") {
      return sendError(res, 400, "INVALID_REQUEST", "cursor pagination is currently supported only with sort=external_id_asc.");
    }

    const result = await searchProducts({
      ...filters,
      limit,
      cursor: Number.isNaN(cursor) ? undefined : cursor,
      sort,
    });

    if (!result) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Amazon demo data has not been loaded.");
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazonRouter.get("/products/facets", async (req, res, next) => {
  try {
    const filters = parseProductFilters(req.query);
    if (!filters) {
      return sendError(res, 400, "INVALID_REQUEST", "Range filters and attribute filters must use valid values. ratingMin/ratingMax must be between 0 and 5.");
    }

    const result = await getProductFacets(filters);
    if (!result) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Amazon demo data has not been loaded.");
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazonRouter.get("/products/:productId", async (req, res, next) => {
  try {
    const site = await getAmazonSite();
    if (!site) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Amazon demo data has not been loaded.");
    }

    const product = await findProductByIdOrSlug(site.id, req.params.productId);
    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    return res.json(await serializeProductDetail(product));
  } catch (error) {
    return next(error);
  }
});
