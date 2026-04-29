import { Types } from "mongoose";
import { gameConfig } from "../../config";
import SpinWheelRepo from "../../database/repositories/SpinWheelRepo";
import ParticipantRepo from "../../database/repositories/ParticipantRepo";
import { coinService } from "./CoinService";
import { SpinWheelStatus } from "../../types/SpinWheel";
import logger from "../../core/logger";

const activeTimers = new Map<string, NodeJS.Timeout>();
const eliminationIntervals = new Map<string, NodeJS.Timeout>();

let emitEvent:
  | ((event: string, spinWheelId: string, data: unknown) => void)
  | null = null;

export function setEmitter(fn: typeof emitEvent) {
  emitEvent = fn;
}

function emit(event: string, spinWheelId: string, data: unknown) {
  if (emitEvent) emitEvent(event, spinWheelId, data);
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function scheduleAutoStart(spinWheelId: Types.ObjectId) {
  const id = spinWheelId.toString();

  if (activeTimers.has(id)) {
    logger.warn(`[GameEngine] Timer already exists for wheel ${id}, skipping`);
    return;
  }

  const timer = setTimeout(async () => {
    try {
      const wheel = await SpinWheelRepo.findById(spinWheelId);

      if (!wheel || wheel.status !== SpinWheelStatus.WAITING) {
        logger.info(
          `[GameEngine] Timer fired but wheel ${id} is no longer WAITING`,
        );
        return;
      }

      if (wheel.participantsCount < gameConfig.minParticipants) {
        logger.info(
          `[GameEngine] Wheel ${id} aborted — only ${wheel.participantsCount} participants`,
        );
        await abortGame(spinWheelId);
      } else {
        logger.info(`[GameEngine] Wheel ${id} auto-starting`);
        await startGame(spinWheelId);
      }
    } catch (err) {
      logger.error(`[GameEngine] Auto-start error for wheel ${id}`, err);
    }
  }, gameConfig.autoStartDelayMs);

  activeTimers.set(id, timer);
  logger.info(`[GameEngine] Auto-start timer set for wheel ${id}`);
}

export async function startGame(spinWheelId: Types.ObjectId) {
  const id = spinWheelId.toString();

  const existing = activeTimers.get(id);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(id);
  }

  if (eliminationIntervals.has(id)) {
    logger.warn(`[GameEngine] Elimination already running for wheel ${id}`);
    return;
  }

  const participants = await ParticipantRepo.findBySpinWheel(spinWheelId);
  if (participants.length < gameConfig.minParticipants) {
    throw new Error(
      `Need at least ${gameConfig.minParticipants} participants to start`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = participants.map((p: any) => p.userId as Types.ObjectId);
  const shuffled = shuffleArray(userIds);
  await SpinWheelRepo.setEliminationOrder(spinWheelId, shuffled);

  emit("game:started", id, {
    spinWheelId: id,
    participantCount: participants.length,
  });
  logger.info(
    `[GameEngine] Game started for wheel ${id} with ${participants.length} players`,
  );

  runEliminationLoop(spinWheelId, shuffled);
}

export async function resumeActiveGame(spinWheelId: Types.ObjectId) {
  const id = spinWheelId.toString();
  const wheel = await SpinWheelRepo.findById(spinWheelId);
  if (!wheel || wheel.status !== SpinWheelStatus.ACTIVE) return;

  logger.info(
    `[GameEngine] Resuming game ${id} from index ${wheel.currentEliminationIndex}`,
  );

  const remainingOrder = (wheel.eliminationSequence as Types.ObjectId[]).slice(
    wheel.currentEliminationIndex,
  );

  if (remainingOrder.length <= 1) {
    const activeParticipants = await ParticipantRepo.findActive(spinWheelId);
    if (activeParticipants.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const winnerId = (activeParticipants[0] as any).userId as Types.ObjectId;
      await finishGame(spinWheelId, winnerId);
    }
    return;
  }

  runEliminationLoop(spinWheelId, remainingOrder);
}

function runEliminationLoop(
  spinWheelId: Types.ObjectId,
  eliminationOrder: Types.ObjectId[],
) {
  const id = spinWheelId.toString();
  let index = 0;
  const remaining = new Set(eliminationOrder.map((u) => u.toString()));

  const interval = setInterval(async () => {
    try {
      if (remaining.size === 0 || index >= eliminationOrder.length) {
        clearInterval(interval);
        eliminationIntervals.delete(id);
        logger.warn(`[GameEngine] Loop ended unexpectedly for wheel ${id}`);
        return;
      }

      const eliminatedId = eliminationOrder[index];
      index++;

      if (!remaining.has(eliminatedId.toString())) {
        logger.warn(
          `[GameEngine] ${eliminatedId} already eliminated, skipping`,
        );
        return;
      }

      remaining.delete(eliminatedId.toString());

      await ParticipantRepo.markEliminated(spinWheelId, eliminatedId);
      await SpinWheelRepo.advanceEliminationIndex(spinWheelId);

      emit("game:elimination", id, {
        eliminatedUserId: eliminatedId.toString(),
        remaining: remaining.size,
      });

      logger.info(
        `[GameEngine] Eliminated ${eliminatedId}. Remaining: ${remaining.size}`,
      );

      if (remaining.size === 1) {
        clearInterval(interval);
        eliminationIntervals.delete(id);
        const winnerId = new Types.ObjectId([...remaining][0]);
        await finishGame(spinWheelId, winnerId);
      }
    } catch (err) {
      logger.error(`[GameEngine] Elimination error for wheel ${id}`, err);
      clearInterval(interval);
      eliminationIntervals.delete(id);
    }
  }, gameConfig.eliminationIntervalMs);

  eliminationIntervals.set(id, interval);
}

async function finishGame(
  spinWheelId: Types.ObjectId,
  winnerId: Types.ObjectId,
) {
  const id = spinWheelId.toString();

  await ParticipantRepo.markWinner(spinWheelId, winnerId);
  await SpinWheelRepo.markFinished(spinWheelId, winnerId);
  await coinService.processPayout(spinWheelId);

  emit("game:finished", id, { winnerId: winnerId.toString() });
  logger.info(`[GameEngine] Game finished. Winner: ${winnerId} on wheel ${id}`);
}

export async function abortGame(spinWheelId: Types.ObjectId) {
  const id = spinWheelId.toString();

  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }

  const interval = eliminationIntervals.get(id);
  if (interval) {
    clearInterval(interval);
    eliminationIntervals.delete(id);
  }

  const wheel = await SpinWheelRepo.findById(spinWheelId);
  if (!wheel) return;

  let userIdsToRefund: Types.ObjectId[];

  if (wheel.status === SpinWheelStatus.WAITING) {
    const participants = await ParticipantRepo.findBySpinWheel(spinWheelId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userIdsToRefund = participants.map((p: any) => p.userId as Types.ObjectId);
  } else {
    const activeParticipants = await ParticipantRepo.findActive(spinWheelId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userIdsToRefund = activeParticipants.map(
      (p: any) => p.userId as Types.ObjectId,
    );
  }

  await SpinWheelRepo.markAborted(spinWheelId);
  await coinService.processRefunds(spinWheelId, userIdsToRefund);

  emit("game:aborted", id, {
    spinWheelId: id,
    reason: "Game aborted by admin",
  });
  logger.info(
    `[GameEngine] Game aborted. Refunded ${userIdsToRefund.length} participants`,
  );
}
