import rateLimit from "express-rate-limit";

export const joinRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    statusCode: "10001",
    message: "Too many requests. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    statusCode: "10001",
    message: "Too many auth attempts. Please try again in 15 minutes.",
  },
});
