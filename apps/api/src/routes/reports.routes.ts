import { Router } from "express";
import { getReportPdfController, getReports, patchReportSign, postFinalReport } from "../controllers/reports.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../lib/http-error.js";

const router = Router();

router.get("/", requireAuth(), asyncHandler(getReports));
router.get("/:id/pdf", requireAuth(), asyncHandler(getReportPdfController));
router.post("/final/:stagiaireId", requireAuth(["TUTEUR", "ADMIN_RH", "RESPONSABLE_RH"]), asyncHandler(postFinalReport));
router.patch("/:id/sign", requireAuth(["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"]), asyncHandler(patchReportSign));

export default router;
