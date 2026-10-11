import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { changePassword, login } from "../services/auth.service.js";

export async function postLogin(req: Request, res: Response) {
  try {
    res.json(await login(req.body.email, req.body.password));
  } catch {
    res.status(401).json({ message: "Identifiants invalides" });
  }
}

export async function postChangePassword(req: AuthenticatedRequest, res: Response) {
  // L'identité vient du jeton, jamais du corps de la requête.
  await changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  res.json({ message: "Mot de passe mis à jour" });
}
