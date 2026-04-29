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

async function start() {
  try {
    await connectDB();
    logger.info("Database connected");

    const httpServer = createServer(app);
    initSocketIO(httpServer);

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
