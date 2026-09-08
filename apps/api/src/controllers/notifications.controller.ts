import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { listNotifications, markNotificationRead } from "../services/notifications.service.js";

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  res.json(await listNotifications(req.user!.sub));
}

export async function patchNotificationRead(req: AuthenticatedRequest, res: Response) {
  res.json(await markNotificationRead(String(req.params.id)));
}
