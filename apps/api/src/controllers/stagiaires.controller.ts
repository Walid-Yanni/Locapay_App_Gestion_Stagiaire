import type { Request, Response } from "express";
import { createStagiaire, getStagiaire, listStagiaires } from "../services/stagiaires.service.js";

export async function getStagiaires(req: Request, res: Response) {
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
  const service = Array.isArray(req.query.service) ? req.query.service[0] : req.query.service;
  const tutorId = Array.isArray(req.query.tutorId) ? req.query.tutorId[0] : req.query.tutorId;

  res.json(
    await listStagiaires({
      status: status ? String(status) : undefined,
      service: service ? String(service) : undefined,
      tutorId: tutorId ? String(tutorId) : undefined,
    }),
  );
}

export async function getStagiaireById(req: Request, res: Response) {
  const stagiaire = await getStagiaire(String(req.params.id));
  if (!stagiaire) return res.status(404).json({ message: "Stagiaire introuvable" });
  res.json(stagiaire);
}

export async function postStagiaire(req: Request, res: Response) {
  res.status(201).json(await createStagiaire(req.body));
}
