import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { dashboardController } from "../controllers/dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/", dashboardController.get);

export default router;
