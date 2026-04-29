import { RequestHandler, Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { BadRequestError } from "../core/ApiError";
import { ValidationSource } from "../helpers/validator";

export const validator = (
  schema: ZodSchema,
  source: ValidationSource,
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source as keyof Request]);
    if (!result.success) {
      // Use ZodError<any> to satisfy TypeScript's strict generic requirements
      const error = result.error as ZodError<any>;
      const firstError = error.issues[0];
      const field = firstError?.path.join(".") || "input";
      return next(new BadRequestError(`${field}: ${firstError?.message}`));
    }
    next();
  };
};
