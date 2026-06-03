import cors from "cors";
import express from "express";

import { sendError } from "./lib/http.js";
import { amazon2023Router } from "./routes/amazon2023.js";
import { amazon2023AiRouter } from "./routes/amazon2023-ai.js";
import { logsRouter } from "./routes/logs.js";

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = new Set([...configuredOrigins, ...localDevOrigins]);

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin denied"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/demos/amazon", amazon2023Router);
app.use("/api/demos/amazon2023", amazon2023Router);
app.use("/api/ai/amazon", amazon2023AiRouter);
app.use("/api/ai/amazon2023", amazon2023AiRouter);
app.use("/api/logs", logsRouter);

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  sendError(res, 500, "INTERNAL_ERROR", "Unexpected backend error.");
});
