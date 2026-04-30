import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import schema from "./schema";
import { asyncHandler } from "../../core/asyncHandler";
import { PublicRequest } from "../../types/app-requests";
import UserRepo from "../../database/repositories/UserRepo";
import { AuthFailureError, BadRequestError } from "../../core/ApiError";
import crypto from "crypto";
import KeystoreRepo from "../../database/repositories/KeystoreRepo";
import { createTokens, isPasswordCorrect } from "../../core/authUtils";
import { SuccessResponse } from "../../core/ApiResponse";
import { ValidationSource } from "../../helpers/validator";

const router = Router();

router.post(
  "/",
  validator(schema.signin, ValidationSource.BODY),
  asyncHandler(async (req: PublicRequest, res) => {
    const user = await UserRepo.findByEmail(req.body.email);
    if (!user) throw new BadRequestError("User not registered.");
    if (!user.password) throw new AuthFailureError("Authentication failure.");

    const isValid = await isPasswordCorrect(req.body.password, user.password);
    if (!isValid) throw new AuthFailureError("Authentication failure.");

    const accessTokenKey = crypto.randomBytes(64).toString("hex");
    const refreshTokenKey = crypto.randomBytes(64).toString("hex");

    await KeystoreRepo.create(user, accessTokenKey, refreshTokenKey);
    const tokens = await createTokens(user, accessTokenKey, refreshTokenKey);

    new SuccessResponse("Login successful.", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        coins: user.coins,
      },
      tokens,
    }).send(res);
  }),
);

export default router;
