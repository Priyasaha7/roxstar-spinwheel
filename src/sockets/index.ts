/**
 * ============================================================
 * RoxStar Spin Wheel — Socket.IO Server (v2.0)
 * ============================================================
 *
 * ARCHITECTURE OVERVIEW:
 * ─────────────────────
 * Every Socket.IO connection goes through a middleware pipeline
 * before any event is handled (connect → auth → rateLimit → events).
 *
 * Room Model: Each spin wheel game = one Socket.IO room.
 * Presence: Deduplicated by userId to handle multi-device connections.
 * ============================================================
 */

import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import logger from "../core/logger";
import { setEmitter } from "../services/spinwheel/GameEngine";
import jwtUtils from "../core/jwtUtils";
import UserRepo from "../database/repositories/UserRepo";
import { Types } from "mongoose";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
}

// ─── State Management ─────────────────────────────────────────────────────────

// Map<roomId, Map<userId, { userName, sockets }>>
// Deduplicates users if they open multiple tabs/devices.
const roomPresence = new Map<
  string,
  Map<string, { userName: string; sockets: Set<string> }>
>();

// Map<roomId, Array<ChatMessage>>
const roomChatHistory = new Map<
  string,
  Array<{
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
  }>
>();
const MAX_CHAT_HISTORY = 50;

// Map<socketId, RateLimitEntry>
const messageRateLimiter = new Map<
  string,
  { count: number; resetAt: number }
>();
const MAX_MESSAGES_PER_MINUTE = 30;

// ─── Middlewares ──────────────────────────────────────────────────────────────

async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token =
      (socket.handshake.auth as { token?: string }).token ||
      (socket.handshake.query.token as string);

    if (!token) {
      logger.warn(
        `[Socket] Connection rejected — no token from ${socket.handshake.address}`,
      );
      return next(new Error("AUTH_REQUIRED: No token provided"));
    }

    const payload = await jwtUtils.validate(token);
    if (!payload.sub) {
      return next(new Error("AUTH_REQUIRED: Invalid token payload"));
    }

    const user = await UserRepo.findById(new Types.ObjectId(payload.sub));
    if (!user || !user.status) {
      return next(new Error("AUTH_REQUIRED: User not found or inactive"));
    }

    (socket as AuthenticatedSocket).userId = user._id.toString();
    (socket as AuthenticatedSocket).userName = user.name || "Anonymous";

    logger.info(`[Socket] Authenticated: ${user.name} (${socket.id})`);
    next();
  } catch (err) {
    logger.warn(`[Socket] Auth failed: ${(err as Error).message}`);
    next(new Error("AUTH_REQUIRED: Token invalid or expired"));
  }
}

function rateLimitMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const now = Date.now();
  const entry = messageRateLimiter.get(socket.id);

  if (!entry || now > entry.resetAt) {
    messageRateLimiter.set(socket.id, { count: 1, resetAt: now + 60_000 });
    return next();
  }

  if (entry.count >= MAX_MESSAGES_PER_MINUTE) {
    return next(new Error("RATE_LIMITED: Too many messages, slow down"));
  }

  entry.count++;
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addToPresence(
  roomId: string,
  userId: string,
  userName: string,
  socketId: string,
): void {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }
  const room = roomPresence.get(roomId)!;

  if (!room.has(userId)) {
    room.set(userId, { userName, sockets: new Set() });
  }
  room.get(userId)!.sockets.add(socketId);
}

function removeFromPresence(roomId: string, socketId: string): void {
  const room = roomPresence.get(roomId);
  if (!room) return;

  for (const [userId, profile] of room.entries()) {
    if (profile.sockets.has(socketId)) {
      profile.sockets.delete(socketId);

      if (profile.sockets.size === 0) {
        room.delete(userId);
      }
      break;
    }
  }

  if (room.size === 0) {
    roomPresence.delete(roomId);
    roomChatHistory.delete(roomId);
  }
}

function getPresenceList(
  roomId: string,
): Array<{ userId: string; userName: string }> {
  const room = roomPresence.get(roomId);
  if (!room) return [];

  return Array.from(room.entries()).map(([userId, profile]) => ({
    userId,
    userName: profile.userName,
  }));
}

function addChatMessage(
  roomId: string,
  userId: string,
  userName: string,
  message: string,
): void {
  if (!roomChatHistory.has(roomId)) {
    roomChatHistory.set(roomId, []);
  }
  const history = roomChatHistory.get(roomId)!;
  history.push({ userId, userName, message, timestamp: Date.now() });

  if (history.length > MAX_CHAT_HISTORY) {
    history.shift();
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 25_000,
    pingTimeout: 60_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.use(authMiddleware);

  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;

    socket.on("join:room", async (spinWheelId: string) => {
      if (!spinWheelId || typeof spinWheelId !== "string") {
        socket.emit("error", { message: "Invalid room ID" });
        return;
      }

      await socket.join(spinWheelId);
      addToPresence(spinWheelId, socket.userId, socket.userName, socket.id);

      const presenceList = getPresenceList(spinWheelId);
      const viewerCount = presenceList.length;

      io.to(spinWheelId).emit("room:presence", {
        viewers: presenceList,
        count: viewerCount,
      });

      const history = roomChatHistory.get(spinWheelId) || [];
      socket.emit("chat:history", {
        messages: history,
        note: `Last ${history.length} messages`,
      });

      io.to(spinWheelId).emit("room:joined", {
        userId: socket.userId,
        userName: socket.userName,
        viewerCount,
        timestamp: Date.now(),
      });
    });

    socket.on("leave:room", async (spinWheelId: string) => {
      await socket.leave(spinWheelId);
      removeFromPresence(spinWheelId, socket.id);

      const viewerCount = getPresenceList(spinWheelId).length;

      io.to(spinWheelId).emit("room:left", {
        userId: socket.userId,
        userName: socket.userName,
        viewerCount,
        timestamp: Date.now(),
      });
    });

    socket.use((_, next) => rateLimitMiddleware(socket, next));

    socket.on("chat:message", (data: { roomId: string; message: string }) => {
      const { roomId, message } = data;

      if (!roomId || !message || typeof message !== "string") return;

      const sanitised = message
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 200);
      if (!sanitised) return;

      const chatPayload = {
        userId: socket.userId,
        userName: socket.userName,
        message: sanitised,
        timestamp: Date.now(),
      };

      addChatMessage(roomId, socket.userId, socket.userName, sanitised);
      io.to(roomId).emit("chat:message", chatPayload);
    });

    socket.on("chat:reaction", (data: { roomId: string; emoji: string }) => {
      const { roomId, emoji } = data;
      const allowedEmojis = ["❤️", "🔥", "👏", "😮", "🎉", "💰", "👑"];

      if (!allowedEmojis.includes(emoji)) return;

      io.to(roomId).emit("chat:reaction", {
        userId: socket.userId,
        userName: socket.userName,
        emoji,
        timestamp: Date.now(),
      });
    });

    socket.on("game:status", (spinWheelId: string) => {
      const presenceList = getPresenceList(spinWheelId);
      const history = roomChatHistory.get(spinWheelId) || [];

      socket.emit("game:status", {
        spinWheelId,
        viewerCount: presenceList.length,
        viewers: presenceList,
        recentChat: history.slice(-10),
      });
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now(), socketId: socket.id });
    });

    socket.on("disconnect", async (reason: string) => {
      messageRateLimiter.delete(socket.id);

      for (const [roomId] of roomPresence) {
        const before = getPresenceList(roomId).length;
        removeFromPresence(roomId, socket.id);
        const after = getPresenceList(roomId).length;

        if (before !== after) {
          io.to(roomId).emit("room:left", {
            userId: socket.userId,
            userName: socket.userName,
            viewerCount: after,
            timestamp: Date.now(),
          });
        }
      }
    });

    socket.on("error", (err: Error) => {
      socket.emit("server:error", {
        message: err.message,
        timestamp: Date.now(),
      });
    });
  });

  setEmitter((event: string, spinWheelId: string, data: unknown) => {
    io.to(spinWheelId).emit(event, data);
  });

  logger.info(
    "[Socket] Server initialized with auth + deduplicated presence + chat",
  );
  return io;
}

export { roomPresence, roomChatHistory };
