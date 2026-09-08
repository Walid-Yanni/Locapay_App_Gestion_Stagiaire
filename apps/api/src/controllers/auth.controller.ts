import type { Request, Response } from "express";
import { login } from "../services/auth.service.js";

export async function postLogin(req: Request, res: Response) {
  try {
    res.json(await login(req.body.email, req.body.password));
  } catch {
    res.status(401).json({ message: "Identifiants invalides" });
  }
}
