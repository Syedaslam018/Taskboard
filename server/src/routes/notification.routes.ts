import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { notificationController } from "../controllers/notification.controller";

const router = Router();

router.use(requireAuth);

router.get("/", notificationController.list);
router.patch("/:id/read", notificationController.markRead);

export default router;
