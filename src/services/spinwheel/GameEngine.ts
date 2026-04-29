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

  const timer = setTimeout(async () => {
    try {
      const wheel = await SpinWheelRepo.findById(spinWheelId);
      if (!wheel || wheel.status !== SpinWheelStatus.WAITING) return;

      // Fixed: participantsCount
      if (wheel.participantsCount < gameConfig.minParticipants) {
        logger.info(
          `[GameEngine] Wheel ${id} aborted — not enough participants`,
        );
        await abortGame(spinWheelId);
      } else {
        logger.info(`[GameEngine] Wheel ${id} auto-starting`);
        await startGame(spinWheelId);
      }
    } catch (err) {
      logger.error(`[GameEngine] Auto-start error for ${id}`, err);
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

  const participants = await ParticipantRepo.findBySpinWheel(spinWheelId);
  if (participants.length < gameConfig.minParticipants) {
    throw new Error(`Need at least ${gameConfig.minParticipants} participants`);
  }

  // Fixed: explicit any typing to satisfy map
  const userIds = participants.map((p: any) => p.userId as Types.ObjectId);
  const shuffled = shuffleArray(userIds);
  await SpinWheelRepo.setEliminationOrder(spinWheelId, shuffled);

  emit("game:started", id, {
    spinWheelId: id,
    participantCount: participants.length,
  });
  logger.info(`[GameEngine] Game started for wheel ${id}`);

  runEliminationLoop(spinWheelId, shuffled);
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
      if (index >= eliminationOrder.length) {
        clearInterval(interval);
        eliminationIntervals.delete(id);
        return;
      }

      const eliminatedId = eliminationOrder[index];
      index++;

      if (!remaining.has(eliminatedId.toString())) return;
      remaining.delete(eliminatedId.toString());

      await ParticipantRepo.markEliminated(spinWheelId, eliminatedId);
      await SpinWheelRepo.advanceEliminationIndex(spinWheelId);

      emit("game:elimination", id, {
        eliminatedUserId: eliminatedId.toString(),
        remaining: remaining.size,
      });

      logger.info(
        `[GameEngine] Eliminated ${eliminatedId} from wheel ${id}. Remaining: ${remaining.size}`,
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

  await SpinWheelRepo.markAborted(spinWheelId);

  const participants = await ParticipantRepo.findBySpinWheel(spinWheelId);
  const userIds = participants.map((p: any) => p.userId as Types.ObjectId);
  await coinService.processRefunds(spinWheelId, userIds);

  emit("game:aborted", id, {
    spinWheelId: id,
    reason: "Not enough participants",
  });
  logger.info(`[GameEngine] Game aborted and refunds issued for wheel ${id}`);
}
