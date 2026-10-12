import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { listActiveTutors } from "../services/users.service.js";

export async function getTutors(_req: AuthenticatedRequest, res: Response) {
  res.json(await listActiveTutors());
}
