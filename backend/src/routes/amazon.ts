import { Router } from "express";

import { parseNonNegativeInteger, sendError } from "../lib/http.js";
import { findProductByIdOrSlug, getAmazonCategories, getAmazonHome, getAmazonSite, searchProducts, serializeProductDetail } from "../repositories/amazon.js";

export const amazonRouter = Router();

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
    if (limit === null || cursor === null) {
      return sendError(res, 400, "INVALID_REQUEST", "limit and cursor must be non-negative integers.");
    }

    const result = await searchProducts({
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      category: typeof req.query.category === "string" ? req.query.category.trim() : undefined,
      subCategory: typeof req.query.subCategory === "string" ? req.query.subCategory.trim() : undefined,
      limit,
      cursor: Number.isNaN(cursor) ? undefined : cursor,
    });

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
