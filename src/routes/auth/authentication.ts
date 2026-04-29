import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import schema from "./schema";
import { ValidationSource } from "../../helpers/validator";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import { getAccessToken, validateTokenData } from "../../core/authUtils";
import { AccessTokenError, AuthFailureError } from "../../core/ApiError";
import { TokenExpiredError } from "jsonwebtoken";
import jwtUtils from "../../core/jwtUtils";
import UserRepo from "../../database/repositories/UserRepo";
import KeystoreRepo from "../../database/repositories/KeystoreRepo";
import { Types } from "mongoose";

const router = Router();

export default router.use(
  validator(schema.auth, ValidationSource.HEADER),
  asyncHandler(async (req: ProtectedRequest, _res, next) => {
    req.accessToken = getAccessToken(req.headers.authorization);

    try {
      const payload = await jwtUtils.validate(req.accessToken);
      validateTokenData(payload);

      const user = await UserRepo.findById(new Types.ObjectId(payload.sub));
      if (!user) throw new AuthFailureError("User not registered.");
      req.user = user;

      const keystore = await KeystoreRepo.findForKey(req.user, payload.prm);
      if (!keystore) throw new AuthFailureError("Invalid access token.");
      req.keystore = keystore;

      return next();
    } catch (e) {
      if (e instanceof TokenExpiredError) throw new AccessTokenError(e.message);
      throw e;
    }
  }),
);
