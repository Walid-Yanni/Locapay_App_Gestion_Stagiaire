// apps/api/src/lib/attempt-limiter.ts
// Limiteur de tentatives en mémoire (une seule instance d'API, ce qui est le cas sur le VPS prévu).
// Chaque requête consomme une tentative DÈS son arrivée (pas à la fin) : des centaines de requêtes
// lancées en parallèle ne peuvent donc pas dépasser la limite. Une réponse réussie (< 400) rend la
// tentative et remet le compteur à zéro. Au-delà de la limite : 429 avec l'en-tête Retry-After.
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface AttemptLimiterOptions {
  /** Nombre de tentatives autorisées par fenêtre et par clé. */
  max: number;
  windowMs: number;
  message: string;
  /** Clé de comptage ; par défaut l'adresse IP (req.ip, fiable derrière un proxy si TRUST_PROXY est réglé). */
  key?: (req: Request) => string | undefined;
  /** Horloge injectable pour les tests. */
  now?: () => number;
}

export function createAttemptLimiter(options: AttemptLimiterOptions) {
  const now = options.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Nettoyage périodique des fenêtres expirées ; unref : ne retient jamais l'arrêt du processus.
  const timer = setInterval(() => {
    const t = now();
    for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
  }, 60_000);
  timer.unref();

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const key = options.key?.(req) ?? req.ip ?? "inconnu";
    const t = now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + options.windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= options.max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - t) / 1000))));
      res.status(429).json({ message: options.message });
      return;
    }
    entry.count += 1;
    res.on("finish", () => {
      if (res.statusCode < 400) hits.delete(key);
    });
    next();
  };

  return { middleware, reset: () => hits.clear() };
}

const FENETRE_15_MIN = 15 * 60 * 1000;
const MESSAGE = "Trop de tentatives. Réessayez dans quelques minutes.";

/** Connexion : limite par adresse IP, et par adresse e-mail pour freiner les attaques réparties. */
export const loginLimiterParIp = createAttemptLimiter({ max: 20, windowMs: FENETRE_15_MIN, message: MESSAGE });
export const loginLimiterParEmail = createAttemptLimiter({
  max: 8,
  windowMs: FENETRE_15_MIN,
  message: MESSAGE,
  key: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" ? `email:${email.trim().toLowerCase()}` : undefined;
  },
});

/** Changement de mot de passe : limite par IP (un mauvais mot de passe actuel répond 400). */
export const changePasswordLimiter = createAttemptLimiter({ max: 10, windowMs: FENETRE_15_MIN, message: MESSAGE });
