import { Router } from "express";

import { parseNonNegativeInteger, sendError } from "../lib/http.js";
import { findItemByIdOrSlug, getHome, getNetflixSite, getShelves, searchItems, serializeItemDetail } from "../repositories/netflix.js";

export const netflixRouter = Router();

netflixRouter.get("/home", async (req, res, next) => {
  try {
    const limitPerShelf = parseNonNegativeInteger(req.query.limitPerShelf, Number.NaN, 100);
    if (limitPerShelf === null) {
      return sendError(res, 400, "INVALID_REQUEST", "limitPerShelf must be a non-negative integer.");
    }

    const home = await getHome(Number.isNaN(limitPerShelf) ? undefined : limitPerShelf);
    if (!home) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Netflix demo data has not been loaded.");
    }

    return res.json(home);
  } catch (error) {
    return next(error);
  }
});

netflixRouter.get("/shelves", async (req, res, next) => {
  try {
    const limitPerShelf = parseNonNegativeInteger(req.query.limitPerShelf, Number.NaN, 100);
    if (limitPerShelf === null) {
      return sendError(res, 400, "INVALID_REQUEST", "limitPerShelf must be a non-negative integer.");
    }

    const shelves = await getShelves(Number.isNaN(limitPerShelf) ? undefined : limitPerShelf);
    if (!shelves) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Netflix demo data has not been loaded.");
    }

    return res.json({ demo: "netflix", shelves });
  } catch (error) {
    return next(error);
  }
});

netflixRouter.get("/items", async (req, res, next) => {
  try {
    const limit = parseNonNegativeInteger(req.query.limit, 20, 100);
    const offset = parseNonNegativeInteger(req.query.offset, 0, 10000);
    if (limit === null || offset === null) {
      return sendError(res, 400, "INVALID_REQUEST", "limit and offset must be non-negative integers.");
    }

    const result = await searchItems({
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      tag: typeof req.query.tag === "string" ? req.query.tag.trim() : undefined,
      limit,
      offset,
    });

    if (!result) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Netflix demo data has not been loaded.");
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

netflixRouter.get("/items/:itemId", async (req, res, next) => {
  try {
    const site = await getNetflixSite();
    if (!site) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Netflix demo data has not been loaded.");
    }

    const item = await findItemByIdOrSlug(site.id, req.params.itemId);
    if (!item) {
      return sendError(res, 404, "ITEM_NOT_FOUND", "Media item not found.");
    }

    return res.json(await serializeItemDetail(item));
  } catch (error) {
    return next(error);
  }
});
