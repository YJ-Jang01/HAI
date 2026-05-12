import type { Response } from "express";

export function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

export function parseNonNegativeInteger(value: unknown, fallback: number, max: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return Math.min(parsed, max);
}
