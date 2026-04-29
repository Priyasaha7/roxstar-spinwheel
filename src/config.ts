import dotenv from "dotenv";

dotenv.config();

export const originUrl = process.env.ORIGIN_URL || "*";
export const isProduction = process.env.NODE_ENV === "production";
export const port = process.env.PORT || "3000";

export const tokenInfo = {
  accessTokenValidity: parseInt(
    process.env.ACCESS_TOKEN_VALIDITY_SEC || "3600",
  ),
  refreshTokenValidity: parseInt(
    process.env.REFRESH_TOKEN_VALIDITY_SEC || "86400",
  ),
  issuer: process.env.TOKEN_ISSUER || "roxstar",
  audience: process.env.TOKEN_AUDIENCE || "roxstar-app",
};

export const db = {
  name: process.env.DB_NAME || "",
  host: process.env.DB_HOST || "",
  user: process.env.DB_USER || "",
  password: process.env.DB_USER_PASSWORD || "",
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "2"),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "10"),
};

export const logDirectory = process.env.LOG_DIRECTORY || "logs";

// ─── Game constants (Client requirements: 3 min wait, 7s eliminations, min 3 players)
export const gameConfig = {
  autoStartDelayMs: 3 * 60 * 1000, // 3 minutes
  eliminationIntervalMs: 7 * 1000, // 7 seconds
  minParticipants: 3,
};
