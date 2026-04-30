process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

import { createServer } from "http";
import logger from "./core/logger";
import { port } from "./config";
import { connectDB } from "./database/index";
import { app } from "./app";
import { initSocketIO } from "./sockets/index";
import { resumeActiveGame } from "./services/spinwheel/GameEngine";
import SpinWheelRepo from "./database/repositories/SpinWheelRepo";
import { SpinWheelStatus } from "./types/SpinWheel";

async function recoverActiveGames() {
  const activeWheel = await SpinWheelRepo.findByStatus(SpinWheelStatus.ACTIVE);
  if (activeWheel) {
    logger.warn(
      `[Recovery] Found active game ${activeWheel._id} — resuming elimination loop`,
    );
    await resumeActiveGame(activeWheel._id);
  }

  const waitingWheel = await SpinWheelRepo.findByStatus(
    SpinWheelStatus.WAITING,
  );
  if (waitingWheel) {
    logger.warn(
      `[Recovery] Found waiting game ${waitingWheel._id} — evaluating immediately`,
    );
    const { gameConfig } = await import("./config");

    setTimeout(async () => {
      const { abortGame, startGame } =
        await import("./services/spinwheel/GameEngine");
      const wheel = await SpinWheelRepo.findById(waitingWheel._id);
      if (!wheel || wheel.status !== SpinWheelStatus.WAITING) return;
      if (wheel.participantsCount < gameConfig.minParticipants) {
        await abortGame(waitingWheel._id);
      } else {
        await startGame(waitingWheel._id);
      }
    }, 1000);
  }
}

async function start() {
  try {
    await connectDB();
    logger.info("Database connected");

    const httpServer = createServer(app);
    initSocketIO(httpServer);

    await recoverActiveGames();

    httpServer.listen(port, () => {
      logger.info(`🚀 RoxStar Spin Wheel server running on port: ${port}`);
      logger.info(`🔌 WebSocket server ready`);
    });
  } catch (err) {
    logger.error("Startup error", err);
    process.exit(1);
  }
}

start();
