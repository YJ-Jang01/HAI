import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { demoSites, interactionLogs } from "../db/schema.js";
import { sendError } from "../lib/http.js";

const logBodySchema = z.object({
  demo: z.string().min(1),
  sessionId: z.string().min(1),
  participantId: z.string().optional().nullable(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

export const logsRouter = Router();

async function createInteractionLog(input: z.infer<typeof logBodySchema>) {
  const [site] = await db.select().from(demoSites).where(eq(demoSites.slug, input.demo)).limit(1);
  if (!site) {
    return null;
  }

  const [log] = await db
    .insert(interactionLogs)
    .values({
      demoSiteId: site.id,
      sessionId: input.sessionId,
      participantId: input.participantId ?? null,
      eventType: input.eventType,
      payload: input.payload,
    })
    .returning({ id: interactionLogs.id });

  return log;
}

logsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = logBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "demo, sessionId, eventType, and object payload are required.");
    }

    const log = await createInteractionLog(parsed.data).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Interaction log write skipped: ${message}`);
      return null;
    });
    if (!log) {
      return res.status(202).json({ ok: true, logged: false });
    }

    return res.status(201).json({ ok: true, logId: log.id });
  } catch (error) {
    return next(error);
  }
});
