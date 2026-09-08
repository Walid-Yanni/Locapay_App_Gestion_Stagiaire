import type { Request, Response } from "express";
import { createActivity, listActivities, reviewActivity } from "../services/activities.service.js";

export async function getActivities(req: Request, res: Response) {
  const stagiaireId = Array.isArray(req.query.stagiaireId) ? req.query.stagiaireId[0] : req.query.stagiaireId;
  res.json(await listActivities(stagiaireId ? String(stagiaireId) : undefined));
}

export async function postActivity(req: Request, res: Response) {
  res.status(201).json(await createActivity(req.body));
}

export async function patchActivityReview(req: Request, res: Response) {
  res.json(await reviewActivity(String(req.params.id), req.body));
}
