import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@locapay/shared-types";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    role: UserRole;
  };
}

export function requireAuth(allowedRoles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Non authentifie" });
    }

    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET ?? "") as AuthenticatedRequest["user"];
      if (!payload?.sub || !payload.role) {
        return res.status(401).json({ message: "Session invalide" });
      }

      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ message: "Acces refuse" });
      }

      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Session expiree" });
    }
  };
}
