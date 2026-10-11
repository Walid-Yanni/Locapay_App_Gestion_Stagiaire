import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { createStagiaire, getStagiaire, listStagiaires } from "../services/stagiaires.service.js";

export async function getStagiaires(req: AuthenticatedRequest, res: Response) {
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
  const service = Array.isArray(req.query.service) ? req.query.service[0] : req.query.service;
  const tutorId = Array.isArray(req.query.tutorId) ? req.query.tutorId[0] : req.query.tutorId;

  res.json(
    await listStagiaires({
      status: status ? String(status) : undefined,
      service: service ? String(service) : undefined,
      tutorId: tutorId ? String(tutorId) : undefined,
    }, req.user!),
  );
}

export async function getStagiaireById(req: AuthenticatedRequest, res: Response) {
  const stagiaire = await getStagiaire(String(req.params.id), req.user!);
  if (!stagiaire) return res.status(404).json({ message: "Stagiaire introuvable" });
  res.json(stagiaire);
}

export async function postStagiaire(req: AuthenticatedRequest, res: Response) {
  res.status(201).json(await createStagiaire(req.body, req.user!));
}
