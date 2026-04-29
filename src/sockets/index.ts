import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import logger from "../core/logger";
import { setEmitter } from "../services/spinwheel/GameEngine";

let io: SocketServer;

export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    logger.info(`[Socket] Client connected: ${socket.id}`);

    socket.on("join:room", (spinWheelId: string) => {
      socket.join(spinWheelId);
      logger.info(`[Socket] ${socket.id} joined room ${spinWheelId}`);
    });

    socket.on("leave:room", (spinWheelId: string) => {
      socket.leave(spinWheelId);
    });

    socket.on("disconnect", () => {
      logger.info(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  setEmitter((event: string, spinWheelId: string, data: unknown) => {
    io.to(spinWheelId).emit(event, data);
    logger.debug(`[Socket] Emitted ${event} to room ${spinWheelId}`);
  });

  logger.info("[Socket] Socket.IO initialized");
  return io;
}

export { io };
