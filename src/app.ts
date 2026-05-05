import logger from "./core/logger";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { originUrl } from "./config";
import router from "./routes/index";
import { errorHandler } from "./middlewares/error.middleware";
import { NotFoundError } from "./core/ApiError";

process.on("uncaughtException", (e) => logger.error(e));

export const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(
  express.urlencoded({ limit: "10mb", extended: true, parameterLimit: 50000 }),
);
app.use(
  cors({ origin: originUrl, optionsSuccessStatus: 200, credentials: true }),
);
app.use(cookieParser());

// Use Helmet to secure HTTP headers with strict CSP; disable CSP only temporarily for local WebSocket testing (e.g., Socket.IO CDN), never in production
app.use(helmet());

// All REST routes
app.use("/", router);

// 404 + global error handler
app.use((_req, _res, next) => next(new NotFoundError()));
app.use(errorHandler);
