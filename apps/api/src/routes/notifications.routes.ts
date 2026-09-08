import { Router } from "express";
import { getNotifications, patchNotificationRead } from "../controllers/notifications.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth(), getNotifications);
router.patch("/:id/read", requireAuth(), patchNotificationRead);

export default router;
