import { ErrorRequestHandler, RequestHandler } from "express";
import { isValidObjectId } from "mongoose";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err?.name === "ValidationError") {
    res.status(400).json({ error: err.message });
  } else if (err?.code === 11000) {
    res.status(409).json({ error: "Email already exists" });
  } else if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export function parseId(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !isValidObjectId(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return value;
}

export function parseDate(value: unknown, label: string): Date {
  const d = new Date(value as string);
  if (value == null || Number.isNaN(d.getTime())) {
    throw new HttpError(400, `${label} must be a valid date`);
  }
  return d;
}
