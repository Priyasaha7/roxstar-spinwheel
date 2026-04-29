process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

import logger from "./core/logger";
import { port } from "./config";
import { connectDB } from "./database/index";
import { app } from "./app";

async function start() {
  try {
    await connectDB();
    logger.info("Database connected");

    app.listen(port, () => {
      logger.info(`🚀 RoxStar Spin Wheel server running on port: ${port}`);
    });
  } catch (err) {
    logger.error("Startup error", err);
    process.exit(1);
  }
}

start();
