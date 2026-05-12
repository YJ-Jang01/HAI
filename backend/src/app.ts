import cors from "cors";
import express from "express";

import { sendError } from "./lib/http.js";
import { logsRouter } from "./routes/logs.js";
import { netflixRouter } from "./routes/netflix.js";

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
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

app.use("/api/demos/netflix", netflixRouter);
app.use("/api/logs", logsRouter);

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  sendError(res, 500, "INTERNAL_ERROR", "Unexpected backend error.");
});
