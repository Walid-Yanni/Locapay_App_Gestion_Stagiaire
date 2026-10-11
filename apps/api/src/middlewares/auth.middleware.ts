import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@locapay/shared-types";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    role: UserRole;
  };
}

export interface RequireAuthOptions {
  // Autorise la route même si l'utilisateur doit encore changer son mot de passe.
  allowPendingPasswordChange?: boolean;
}

export function requireAuth(allowedRoles?: UserRole[], options: RequireAuthOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    let payload: AuthenticatedRequest["user"];
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET ?? "") as AuthenticatedRequest["user"];
    } catch {
      return res.status(401).json({ message: "Session expiree" });
    }
    if (!payload?.sub || !payload.role) {
      return res.status(401).json({ message: "Session invalide" });
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({ message: "Acces refuse" });
    }

    try {
      // Relu en base à chaque requête : le drapeau prend effet immédiatement, sans réémettre de jeton.
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true, mustChangePassword: true } });
      // Compte supprimé ou désactivé : le jeton n'ouvre plus aucune route.
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Session invalide" });
      }
      if (user.mustChangePassword && !options.allowPendingPasswordChange) {
        return res.status(403).json({
          message: "Vous devez changer votre mot de passe avant de continuer",
          code: "PASSWORD_CHANGE_REQUIRED",
        });
      }
    } catch (error) {
      return next(error);
    }

    req.user = payload;
    next();
  };
}
