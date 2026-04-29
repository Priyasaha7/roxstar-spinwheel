import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import { SuccessResponse, SuccessMsgResponse } from "../../core/ApiResponse";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/ApiError";
import { validator } from "../../middlewares/validator.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { ValidationSource } from "../../helpers/validator";
import { RoleCode } from "../../types/Role";
import { SpinWheelStatus } from "../../types/SpinWheel";
import SpinWheelRepo from "../../database/repositories/SpinWheelRepo";
import ParticipantRepo from "../../database/repositories/ParticipantRepo";
import { coinService } from "../../services/spinwheel/CoinService";
import {
  scheduleAutoStart,
  startGame,
  abortGame,
} from "../../services/spinwheel/GameEngine";
import authentication from "../auth/authentication";
import schema from "./schema";
import { Types } from "mongoose";
import { gameConfig } from "../../config";
import { joinRateLimiter } from "../../middlewares/rateLimit.middleware";
import { SpinWheelModel } from "../../database/models/SpinWheel";
import TransactionRepo from "../../database/repositories/TransactionRepo";

const router = Router();

// Apply authentication to all spinwheel routes
router.use(authentication);

/*-------------------------------------------------------------------------*/
// Admin & User Dashboard Routes (Bonus)
/*-------------------------------------------------------------------------*/

// GET /spinwheel/dashboard — Admin only monitoring
router.get(
  "/dashboard",
  authorize(RoleCode.ADMIN),
  asyncHandler(async (_req, res) => {
    const [active, recentWheels] = await Promise.all([
      SpinWheelRepo.findActive(),
      SpinWheelModel.find().sort({ createdAt: -1 }).limit(10).lean().exec(),
    ]);

    new SuccessResponse("Dashboard data fetched successfully.", {
      currentGame: active,
      recentHistory: recentWheels,
    }).send(res);
  }),
);

// GET /spinwheel/history/me — User's own transaction audit
router.get(
  "/history/me",
  asyncHandler(async (req: ProtectedRequest, res) => {
    const transactions = await TransactionRepo.findByUser(req.user._id);
    new SuccessResponse("Your transaction history.", transactions).send(res);
  }),
);

/*-------------------------------------------------------------------------*/
// Standard Game Lifecycle Routes
/*-------------------------------------------------------------------------*/

// GET /spinwheel/active — Get current game status
router.get(
  "/active",
  asyncHandler(async (_req, res) => {
    const wheel = await SpinWheelRepo.findActive();
    if (!wheel) throw new NotFoundError("No active spin wheel at the moment.");
    new SuccessResponse("Active spin wheel.", wheel).send(res);
  }),
);

// POST /spinwheel/create — Admin only
router.post(
  "/create",
  authorize(RoleCode.ADMIN),
  validator(schema.create, ValidationSource.BODY),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const existing = await SpinWheelRepo.findActive();
    if (existing) throw new BadRequestError("A spin wheel is already active.");

    const wheel = await SpinWheelRepo.create(req.user._id, req.body.entryFee);
    await scheduleAutoStart(wheel._id);

    new SuccessResponse("Spin wheel created successfully.", {
      _id: wheel._id,
      entryFee: wheel.entryFee,
      status: wheel.status,
      autoStartIn: `${gameConfig.autoStartDelayMs / 1000} seconds`,
    }).send(res);
  }),
);

// POST /spinwheel/:id/join — User join (With Rate Limiting)
router.post(
  "/:id/join",
  joinRateLimiter,
  validator(schema.objectId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const spinWheelId = new Types.ObjectId(req.params.id);
    const userId = req.user._id;

    const wheel = await SpinWheelRepo.findById(spinWheelId);
    if (!wheel) throw new NotFoundError("Spin wheel not found.");

    if (wheel.status !== SpinWheelStatus.WAITING) {
      throw new BadRequestError(
        "This spin wheel is no longer accepting participants.",
      );
    }

    const alreadyJoined = await ParticipantRepo.findByUserAndWheel(
      spinWheelId,
      userId,
    );
    if (alreadyJoined)
      throw new BadRequestError("You have already joined this spin wheel.");

    // Atomic transaction for coin debit and join record
    await coinService.processEntryFee(userId, spinWheelId);
    await ParticipantRepo.create(spinWheelId, userId);
    await SpinWheelRepo.incrementParticipantCount(spinWheelId);

    new SuccessMsgResponse(
      "Successfully joined the spin wheel. Good luck!",
    ).send(res);
  }),
);

// POST /spinwheel/:id/start — Admin manual start
router.post(
  "/:id/start",
  authorize(RoleCode.ADMIN),
  validator(schema.objectId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const spinWheelId = new Types.ObjectId(req.params.id);
    const wheel = await SpinWheelRepo.findById(spinWheelId);

    if (!wheel) throw new NotFoundError("Spin wheel not found.");
    if (wheel.status !== SpinWheelStatus.WAITING)
      throw new BadRequestError("Spin wheel is not in waiting state.");

    if (wheel.participantsCount < gameConfig.minParticipants) {
      throw new BadRequestError(
        `Need at least ${gameConfig.minParticipants} participants to start.`,
      );
    }

    if (wheel.createdBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError("Only the creator admin can start this wheel.");
    }

    await startGame(spinWheelId);
    new SuccessMsgResponse("Spin wheel started!").send(res);
  }),
);

// POST /spinwheel/:id/abort — Admin manual abort/refund
router.post(
  "/:id/abort",
  authorize(RoleCode.ADMIN),
  validator(schema.objectId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const spinWheelId = new Types.ObjectId(req.params.id);
    const wheel = await SpinWheelRepo.findById(spinWheelId);

    if (!wheel) throw new NotFoundError("Spin wheel not found.");
    if (
      wheel.status === SpinWheelStatus.FINISHED ||
      wheel.status === SpinWheelStatus.ABORTED
    ) {
      throw new BadRequestError("Spin wheel is already finished or aborted.");
    }

    if (wheel.createdBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError("Only the creator admin can abort this wheel.");
    }

    await abortGame(spinWheelId);
    new SuccessMsgResponse(
      "Spin wheel aborted. Remaining participants refunded.",
    ).send(res);
  }),
);

// GET /spinwheel/:id/participants — Get current players
router.get(
  "/:id/participants",
  validator(schema.objectId, ValidationSource.PARAM),
  asyncHandler(async (req, res) => {
    const spinWheelId = new Types.ObjectId(req.params.id);
    const participants = await ParticipantRepo.findBySpinWheel(spinWheelId);
    new SuccessResponse("Participants list fetched.", participants).send(res);
  }),
);

export default router;
