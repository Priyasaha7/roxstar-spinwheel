import { NextFunction, Request, Response } from "express";
import logger from "../core/logger";
import { isProduction } from "../config";
import { ApiError, ErrorType } from "../core/ApiError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Error:", {
    error: err,
    url: req.originalUrl,
    method: req.method,
  });

  if (err instanceof ApiError) {
    ApiError.handle(err, res);
    if (err.type === ErrorType.INTERNAL)
      logger.error(
        `500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
      );
    return;
  }

  const message = isProduction
    ? "Something went wrong"
    : err?.message || "Something went wrong";
  res.status(500).json({
    success: false,
    statusCode: 500,
    message,
    timeStamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};
