import { Router } from "express";
import { getEvaluations, postEvaluation } from "../controllers/evaluations.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { createEvaluationSchema } from "../schemas/evaluation.schema.js";

const router = Router();

router.get("/", requireAuth(), getEvaluations);
router.post("/", requireAuth(["TUTEUR", "ADMIN_RH", "RESPONSABLE_RH"]), validateBody(createEvaluationSchema), postEvaluation);

export default router;
