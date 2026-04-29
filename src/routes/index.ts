// import { Router, RequestHandler } from "express";
// import healthRoutes from "./health/index";
// import { apiKeyMiddleware } from "./auth/apiKey";
// import permission from "../middlewares/permission.middleware";
// import { Permission } from "../types/permissions";
// import authRoutes from "./auth/index";

// const router = Router();

// // Public — no auth needed
// router.use("/", healthRoutes);

// // Everything below requires a valid API key in x-api-key header
// router.use(apiKeyMiddleware as unknown as RequestHandler[]);
// router.use(permission(Permission.GENERAL) as RequestHandler);

// // Auth routes: /auth/signup, /auth/signin, /auth/signout, /auth/token/refresh
// router.use("/auth", authRoutes);

// // SpinWheel routes will be added here in next branch
// // router.use('/spinwheel', spinWheelRoutes);

// export default router;
import { Router, RequestHandler } from "express";
import healthRoutes from "./health/index";
import { apiKeyMiddleware } from "./auth/apiKey";
import permission from "../middlewares/permission.middleware";
import { Permission } from "../types/permissions";
import authRoutes from "./auth/index";
import spinWheelRoutes from "./spinwheel/index";

const router = Router();

router.use("/", healthRoutes);

router.use(apiKeyMiddleware as unknown as RequestHandler[]);
router.use(permission(Permission.GENERAL) as RequestHandler);

router.use("/auth", authRoutes);
router.use("/spinwheel", spinWheelRoutes);

export default router;
