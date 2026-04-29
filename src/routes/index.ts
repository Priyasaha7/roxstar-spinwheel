import { Router } from "express";
import healthRoutes from "../routes/health";

const router = Router();

// Health check — public, no auth needed
router.use("/", healthRoutes);

// TODO: auth routes and spinwheel routes will be added in next steps

export default router;
