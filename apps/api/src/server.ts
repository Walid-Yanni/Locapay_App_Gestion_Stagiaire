import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import activitiesRouter from "./routes/activities.routes.js";
import authRouter from "./routes/auth.routes.js";
import evaluationsRouter from "./routes/evaluations.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";
import reportsRouter from "./routes/reports.routes.js";
import stagiairesRouter from "./routes/stagiaires.routes.js";
import usersRouter from "./routes/users.routes.js";
import { scheduleEndOfCycleReports } from "./jobs/endOfCycleReports.job.js";
import { swaggerSpec, swaggerUi } from "./lib/swagger.js";
import { errorHandler } from "./lib/http-error.js";

// Refus de démarrer sans secrets JWT robustes, avant toute initialisation (cron compris).
const MIN_SECRET_LENGTH = 32;
for (const name of ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const) {
  const value = process.env[name];
  if (!value || value.length < MIN_SECRET_LENGTH) {
    console.error(`${name} est absent ou trop court (minimum ${MIN_SECRET_LENGTH} caractères). Démarrage de l'API refusé.`);
    process.exit(1);
  }
}

const isProduction = process.env.NODE_ENV === "production";

// Origines autorisées pour le navigateur : WEB_ORIGIN (liste séparée par des virgules).
// En production, WEB_ORIGIN est obligatoire ; localhost n'est accepté qu'en développement.
const allowedOrigins = (process.env.WEB_ORIGIN ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      console.error(`WEB_ORIGIN contient une adresse invalide (« ${value} »). Démarrage de l'API refusé.`);
      process.exit(1);
    }
  });
if (isProduction && allowedOrigins.length === 0) {
  console.error("WEB_ORIGIN est absent : en production, l'adresse du site web doit être déclarée. Démarrage de l'API refusé.");
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT ?? 4000);

// Derrière un reverse proxy (nginx, Caddy…), TRUST_PROXY=1 permet de lire la vraie IP du client
// (indispensable au limiteur de tentatives : sans cela, tous les clients partageraient l'IP du proxy).
const trustProxyHops = Number(process.env.TRUST_PROXY ?? 0);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set("trust proxy", trustProxyHops);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProduction) {
        try {
          const u = new URL(origin);
          if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return callback(null, true);
        } catch {
          /* adresse illisible : refusée plus bas */
        }
      }
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "locapay-api" }));
app.use("/api/auth", authRouter);
app.use("/api/stagiaires", stagiairesRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users", usersRouter);
// La documentation Swagger décrit toute l'API : fermée en production sauf ENABLE_API_DOCS=true.
if (!isProduction || process.env.ENABLE_API_DOCS === "true") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

scheduleEndOfCycleReports();

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API LOCAPAY demarree sur http://localhost:${port}`);
});
