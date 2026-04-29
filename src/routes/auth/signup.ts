import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import schema from "./schema";
import { asyncHandler } from "../../core/asyncHandler";
import UserRepo from "../../database/repositories/UserRepo";
import { BadRequestError } from "../../core/ApiError";
import crypto from "crypto";
import { createTokens } from "../../core/authUtils";
import { SuccessResponse } from "../../core/ApiResponse";
import { RoleCode } from "../../types/Role";
import { ValidationSource } from "../../helpers/validator";
import User from "../../types/User";

const router = Router();

router.post(
  "/",
  validator(schema.signup, ValidationSource.BODY),
  asyncHandler(async (req, res) => {
    const existing = await UserRepo.findByEmail(req.body.email);
    if (existing) throw new BadRequestError("User already registered.");

    const accessTokenKey = crypto.randomBytes(64).toString("hex");
    const refreshTokenKey = crypto.randomBytes(64).toString("hex");

    // Added "as User" to satisfy TypeScript's strict type checking
    const { user: createdUser, keystore } = await UserRepo.create(
      {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      } as User,
      accessTokenKey,
      refreshTokenKey,
      RoleCode.USER,
    );

    const tokens = await createTokens(
      createdUser,
      keystore.primaryKey,
      keystore.secondaryKey,
    );

    new SuccessResponse("Signup successful.", {
      user: {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        coins: createdUser.coins,
      },
      tokens,
    }).send(res);
  }),
);

export default router;
