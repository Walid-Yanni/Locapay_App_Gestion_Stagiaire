import { Router } from "express";
import { getStagiaireById, getStagiaires, postStagiaire } from "../controllers/stagiaires.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { createStagiaireSchema } from "../schemas/stagiaire.schema.js";

const router = Router();

router.get("/", requireAuth(), getStagiaires);
router.get("/:id", requireAuth(), getStagiaireById);
router.post("/", requireAuth(["ADMIN_RH", "RESPONSABLE_RH"]), validateBody(createStagiaireSchema), postStagiaire);

export default router;
