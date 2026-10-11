import { Router } from "express";
import { getStagiaireById, getStagiaires, postStagiaire } from "../controllers/stagiaires.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { createStagiaireSchema } from "../schemas/stagiaire.schema.js";
import { asyncHandler } from "../lib/http-error.js";

const router = Router();

router.get("/", requireAuth(), asyncHandler(getStagiaires));
router.get("/:id", requireAuth(), asyncHandler(getStagiaireById));
router.post("/", requireAuth(["ADMIN_RH", "RESPONSABLE_RH"]), validateBody(createStagiaireSchema), asyncHandler(postStagiaire));

export default router;
