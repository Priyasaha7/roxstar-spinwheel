import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler";
import KeystoreRepo from "../../database/repositories/KeystoreRepo";
import { SuccessMsgResponse } from "../../core/ApiResponse";
import { ProtectedRequest } from "../../types/app-requests";
import authentication from "./authentication";

const router = Router();

router.use(authentication);

router.delete(
  "/",
  asyncHandler(async (req: ProtectedRequest, res) => {
    await KeystoreRepo.remove(req.keystore._id);
    new SuccessMsgResponse("Logout successful.").send(res);
  }),
);

export default router;
