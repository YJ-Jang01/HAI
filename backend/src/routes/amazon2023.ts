import { Router } from "express";

import { parseNonNegativeInteger, sendError } from "../lib/http.js";
import {
  getAmazon2023Categories,
  getAmazon2023Facets,
  getAmazon2023Manifest,
  getAmazon2023ProductDetail,
  getAmazon2023ProductDetails,
  searchAmazon2023Products,
  type Amazon2023ProductFilters,
  type Amazon2023Sort,
  type Amazon2023ProductView,
  type Amazon2023Locale,
} from "../repositories/amazon2023.js";

export const amazon2023Router = Router();

const productSorts: Amazon2023Sort[] = ["title_asc", "price_asc", "price_desc", "rating_desc", "review_count_desc"];
const productViews: Amazon2023ProductView[] = ["card", "detail"];

function readString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readLocale(value: unknown): Amazon2023Locale {
  return value === "ko" ? "ko" : "en";
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

function parseSort(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "title_asc" satisfies Amazon2023Sort;
  }
  return typeof value === "string" && productSorts.includes(value as Amazon2023Sort) ? (value as Amazon2023Sort) : null;
}

function parseView(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "card" satisfies Amazon2023ProductView;
  }
  return typeof value === "string" && productViews.includes(value as Amazon2023ProductView) ? (value as Amazon2023ProductView) : null;
}

function parseFilters(query: Record<string, unknown>) {
  const priceMin = parseOptionalNonNegativeNumber(query.priceMin);
  const priceMax = parseOptionalNonNegativeNumber(query.priceMax);
  const ratingMin = parseOptionalNonNegativeNumber(query.ratingMin);
  const ratingMax = parseOptionalNonNegativeNumber(query.ratingMax);
  const warmthLevelMin = parseOptionalNonNegativeNumber(query.warmthLevelMin);
  const comfortLevelMin = parseOptionalNonNegativeNumber(query.comfortLevelMin);
  const durabilityLevelMin = parseOptionalNonNegativeNumber(query.durabilityLevelMin);
  const careEaseLevelMin = parseOptionalNonNegativeNumber(query.careEaseLevelMin);
  const semanticConfidenceMin = parseOptionalNonNegativeNumber(query.semanticConfidenceMin);

  if (
    priceMin === null ||
    priceMax === null ||
    ratingMin === null ||
    ratingMax === null ||
    warmthLevelMin === null ||
    comfortLevelMin === null ||
    durabilityLevelMin === null ||
    careEaseLevelMin === null ||
    semanticConfidenceMin === null
  ) {
    return null;
  }
  if ((priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) || (ratingMin !== undefined && ratingMax !== undefined && ratingMin > ratingMax)) {
    return null;
  }
  if ((ratingMin !== undefined && ratingMin > 5) || (ratingMax !== undefined && ratingMax > 5)) {
    return null;
  }

  return {
    datasetSlug: readString(query.dataset),
    locale: readLocale(query.locale),
    query: readString(query.query),
    category: readString(query.category),
    subCategory: readString(query.subCategory),
    color: readString(query.color),
    brand: readString(query.brand),
    priceMin,
    priceMax,
    ratingMin,
    ratingMax,
    genderTarget: readString(query.genderTarget),
    occasion: readString(query.occasion),
    season: readString(query.season),
    material: readString(query.material),
    style: readString(query.style),
    sleeveLength: readString(query.sleeveLength),
    warmthLevelMin,
    comfortLevelMin,
    durabilityLevelMin,
    careEaseLevelMin,
    waterproof: query.waterproof === "true" ? true : query.waterproof === "false" ? false : undefined,
    semanticConfidenceMin,
  } satisfies Amazon2023ProductFilters;
}

amazon2023Router.get("/manifest", async (req, res, next) => {
  try {
    const result = await getAmazon2023Manifest(readString(req.query.dataset));
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazon2023Router.get("/categories", async (req, res, next) => {
  try {
    const result = await getAmazon2023Categories(readString(req.query.dataset));
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazon2023Router.get("/products", async (req, res, next) => {
  try {
    const limit = parseNonNegativeInteger(req.query.limit, 24, 200);
    const offset = parseNonNegativeInteger(req.query.offset, 0, 1000000);
    const filters = parseFilters(req.query);
    const sort = parseSort(req.query.sort);
    const view = parseView(req.query.view);

    if (limit === null || offset === null || !filters || !sort || !view) {
      return sendError(res, 400, "INVALID_REQUEST", "limit, offset, range filters, and sort must use valid values.");
    }

    const result = await searchAmazon2023Products({ ...filters, limit, offset, sort, view });
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazon2023Router.get("/products/facets", async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    if (!filters) {
      return sendError(res, 400, "INVALID_REQUEST", "Range filters must use valid values.");
    }

    const result = await getAmazon2023Facets(filters);
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

amazon2023Router.post("/products/batch", async (req, res, next) => {
  try {
    const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : null;
    if (!productIds || productIds.length < 1 || productIds.length > 20 || productIds.some((value: unknown) => typeof value !== "string" || !value.trim())) {
      return sendError(res, 400, "INVALID_REQUEST", "productIds must be an array of 1-20 product ids.");
    }

    const result = await getAmazon2023ProductDetails(productIds, readString(req.body?.dataset), readLocale(req.body?.locale ?? req.query.locale));
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    return res.json({ dataset: result.dataset, items: result.products });
  } catch (error) {
    return next(error);
  }
});

amazon2023Router.get("/products/:productId", async (req, res, next) => {
  try {
    const result = await getAmazon2023ProductDetail(req.params.productId, readString(req.query.dataset), readLocale(req.query.locale));
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    if (!result.product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }
    return res.json(result.product);
  } catch (error) {
    return next(error);
  }
});
