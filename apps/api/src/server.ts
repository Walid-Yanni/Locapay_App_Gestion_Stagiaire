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
import { scheduleEndOfCycleReports } from "./jobs/endOfCycleReports.job.js";
import { swaggerSpec, swaggerUi } from "./lib/swagger.js";
import { errorHandler } from "./lib/http-error.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const u = new URL(origin);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return callback(null, true);
      } catch (e) {
        /* ignore */
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
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

scheduleEndOfCycleReports();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("JWT_SECRET et JWT_REFRESH_SECRET sont obligatoires et doivent être des chaînes longues et aléatoires.");
  process.exit(1);
}

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API LOCAPAY demarree sur http://localhost:${port}`);
});
