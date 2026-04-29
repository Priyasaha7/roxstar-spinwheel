import { Router } from "express";
import { SuccessMsgResponse } from "../../core/ApiResponse";

const router = Router();

router.get("/", (_req, res) =>
  new SuccessMsgResponse("RoxStar Spin Wheel API is running.").send(res),
);
router.get("/health", (_req, res) =>
  new SuccessMsgResponse("Server is healthy.").send(res),
);

export default router;
