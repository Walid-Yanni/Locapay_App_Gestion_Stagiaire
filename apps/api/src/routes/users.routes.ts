import { Router } from "express";
import { getTutors } from "../controllers/users.controller.js";
import { asyncHandler } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Liste des tuteurs actifs pour le formulaire de création de stagiaire : RH uniquement.
router.get("/tutors", requireAuth(["ADMIN_RH", "RESPONSABLE_RH"]), asyncHandler(getTutors));

export default router;
