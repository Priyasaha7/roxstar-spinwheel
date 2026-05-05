/**
 * ============================================================
 * RoxStar Socket.IO — Event Type Definitions
 * ============================================================
 *
 * This file documents every socket event in the system.
 * Use these types on the frontend (React Native / Android) for
 * type-safe socket event handling.
 *
 * ============================================================
 */

// ─── Client → Server Events (what the client SENDS) ──────────────────────────

export interface ClientToServerEvents {
  /**
   * Join a specific game room.
   * Must be called immediately after connecting.
   * Server responds with: room:joined, room:presence, chat:history
   */
  "join:room": (spinWheelId: string) => void;

  /**
   * Explicitly leave a room.
   * Server responds with: room:left broadcast to remaining users
   */
  "leave:room": (spinWheelId: string) => void;

  /**
   * Send a chat message to everyone in the room.
   * Rate limited: max 30 messages per minute per connection.
   * Message is sanitised (HTML stripped, max 200 chars).
   */
  "chat:message": (data: { roomId: string; message: string }) => void;

  /**
   * Send an emoji reaction.
   * Allowed: ❤️ 🔥 👏 😮 🎉 💰 👑
   * Not stored in chat history — ephemeral display only.
   */
  "chat:reaction": (data: { roomId: string; emoji: string }) => void;

  /**
   * Request current game state (presence + recent chat).
   * Use on reconnect to restore UI without an API call.
   */
  "game:status": (spinWheelId: string) => void;

  /**
   * Application-level ping.
   * Use to verify server is processing events (not just alive).
   * Server responds with: pong
   */
  ping: () => void;
}

// ─── Server → Client Events (what the client RECEIVES) ───────────────────────

export interface ServerToClientEvents {
  /**
   * Broadcast: someone joined the room.
   * Sent to ALL users in the room.
   */
  "room:joined": (data: {
    userId: string;
    userName: string;
    viewerCount: number;
    timestamp: number;
  }) => void;

  /**
   * Broadcast: someone left the room.
   * Sent to ALL remaining users in the room.
   */
  "room:left": (data: {
    userId: string;
    userName: string;
    viewerCount: number;
    timestamp: number;
  }) => void;

  /**
   * Full presence list update.
   * Sent to ALL users whenever someone joins or leaves.
   * Use this to render the participant/viewer list.
   */
  "room:presence": (data: {
    viewers: Array<{ userId: string; userName: string }>;
    count: number;
  }) => void;

  /**
   * Chat history on join.
   * Sent ONLY to the user who just joined.
   * Contains last 50 messages so they have context.
   */
  "chat:history": (data: {
    messages: Array<{
      userId: string;
      userName: string;
      message: string;
      timestamp: number;
    }>;
    note: string;
  }) => void;

  /**
   * New chat message.
   * Sent to ALL users in the room (including sender).
   */
  "chat:message": (data: {
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
  }) => void;

  /**
   * Emoji reaction.
   * Sent to ALL users in the room.
   * Handle on frontend with a floating animation.
   */
  "chat:reaction": (data: {
    userId: string;
    userName: string;
    emoji: string;
    timestamp: number;
  }) => void;

  /**
   * Current game state response (reply to game:status).
   * Sent ONLY to requesting client.
   */
  "game:status": (data: {
    spinWheelId: string;
    viewerCount: number;
    viewers: Array<{ userId: string; userName: string }>;
    recentChat: Array<{
      userId: string;
      userName: string;
      message: string;
      timestamp: number;
    }>;
  }) => void;

  // ── Game Lifecycle Events (emitted by GameEngine) ─────────────────────────

  /**
   * Game has started.
   * Elimination loop begins after this.
   */
  "game:started": (data: {
    spinWheelId: string;
    participantCount: number;
  }) => void;

  /**
   * One player eliminated.
   * Fires every 7 seconds until 1 player remains.
   */
  "game:elimination": (data: {
    eliminatedUserId: string;
    remaining: number;
  }) => void;

  /**
   * Game over — winner declared.
   * Frontend should show celebration UI + payout confirmation.
   */
  "game:finished": (data: { winnerId: string }) => void;

  /**
   * Game cancelled — all survivors refunded.
   * Frontend should show refund confirmation.
   */
  "game:aborted": (data: { spinWheelId: string; reason: string }) => void;

  // ── System Events ──────────────────────────────────────────────────────────

  /**
   * Pong response to client ping.
   */
  pong: (data: { timestamp: number; socketId: string }) => void;

  /**
   * Server-side error that the client should handle gracefully.
   */
  "server:error": (data: { message: string; timestamp: number }) => void;

  /**
   * Generic error (validation, auth, rate limit).
   */
  error: (data: { message: string }) => void;
}
