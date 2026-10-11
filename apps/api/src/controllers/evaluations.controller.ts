import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { createEvaluation, listEvaluations } from "../services/evaluations.service.js";

export async function getEvaluations(req: AuthenticatedRequest, res: Response) {
  res.json(await listEvaluations(req.query.stagiaireId as string | undefined, req.user!));
}

export async function postEvaluation(req: AuthenticatedRequest, res: Response) {
  res.status(201).json(await createEvaluation(req.user!.sub, req.body, req.user!));
}
