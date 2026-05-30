import { Router } from "express";
import { z } from "zod";

import { sendError } from "../lib/http.js";
import { createInteractionLog } from "../repositories/netflix.js";

const logBodySchema = z.object({
  demo: z.string().min(1),
  sessionId: z.string().min(1),
  participantId: z.string().optional().nullable(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

export const logsRouter = Router();

logsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = logBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "demo, sessionId, eventType, and object payload are required.");
    }

    const log = await createInteractionLog(parsed.data);
    if (!log) {
      return sendError(res, 404, "DEMO_NOT_FOUND", "Demo site not found.");
    }

    return res.status(201).json({ ok: true, logId: log.id });
  } catch (error) {
    return next(error);
  }
});
