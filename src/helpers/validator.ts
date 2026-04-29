import mongoose from "mongoose";
import z from "zod";

export enum ValidationSource {
  BODY = "body",
  HEADER = "headers",
  QUERY = "query",
  PARAM = "params",
}

export const ZodObjectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: "Invalid MongoDB ObjectId.",
  });

export const ZodAuthBearer = z
  .string()
  .refine(
    (value) =>
      value.startsWith("Bearer ") &&
      value.split(" ").length === 2 &&
      value.split(" ")[1].trim().length > 0,
    { message: "Invalid Authorization header. Expected: 'Bearer <token>'" },
  );
