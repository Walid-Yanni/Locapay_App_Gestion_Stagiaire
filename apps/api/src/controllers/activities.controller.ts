import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { createActivity, listActivities, reviewActivity } from "../services/activities.service.js";

export async function getActivities(req: AuthenticatedRequest, res: Response) {
  const stagiaireId = Array.isArray(req.query.stagiaireId) ? req.query.stagiaireId[0] : req.query.stagiaireId;
  res.json(await listActivities(stagiaireId ? String(stagiaireId) : undefined, req.user!));
}

export async function postActivity(req: AuthenticatedRequest, res: Response) {
  res.status(201).json(await createActivity(req.body, req.user!));
}

export async function patchActivityReview(req: AuthenticatedRequest, res: Response) {
  res.json(await reviewActivity(String(req.params.id), req.body, req.user!));
}
