import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import schema from "./schema";
import { ValidationSource } from "../../helpers/validator";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import {
  getAccessToken,
  validateTokenData,
  createTokens,
} from "../../core/authUtils";
import JWT from "../../core/jwtUtils";
import UserRepo from "../../database/repositories/UserRepo";
import KeystoreRepo from "../../database/repositories/KeystoreRepo";
import { Types } from "mongoose";
import { AuthFailureError } from "../../core/ApiError";
import crypto from "crypto";
import { TokenRefreshResponse } from "../../core/ApiResponse";

const router = Router();

router.post(
  "/refresh",
  validator(schema.auth, ValidationSource.HEADER),
  validator(schema.refreshToken, ValidationSource.BODY),
  asyncHandler(async (req: ProtectedRequest, res) => {
    req.accessToken = getAccessToken(req.headers.authorization);

    const accessTokenPayload = await JWT.decode(req.accessToken);
    validateTokenData(accessTokenPayload);

    const user = await UserRepo.findById(
      new Types.ObjectId(accessTokenPayload.sub),
    );
    if (!user) throw new AuthFailureError("User not registered.");
    req.user = user;

    const refreshTokenPayload = await JWT.validate(req.body.refreshToken);
    validateTokenData(refreshTokenPayload);

    if (accessTokenPayload.sub !== refreshTokenPayload.sub)
      throw new AuthFailureError("Invalid access token.");

    const keystore = await KeystoreRepo.find(
      req.user,
      accessTokenPayload.prm,
      refreshTokenPayload.prm,
    );
    if (!keystore) throw new AuthFailureError("Invalid access token.");

    await KeystoreRepo.remove(keystore._id);

    const accessTokenKey = crypto.randomBytes(64).toString("hex");
    const refreshTokenKey = crypto.randomBytes(64).toString("hex");

    await KeystoreRepo.create(req.user, accessTokenKey, refreshTokenKey);
    const tokens = await createTokens(
      req.user,
      accessTokenKey,
      refreshTokenKey,
    );

    new TokenRefreshResponse(
      "Token issued.",
      tokens.accessToken,
      tokens.refreshToken,
    ).send(res);
  }),
);

export default router;
