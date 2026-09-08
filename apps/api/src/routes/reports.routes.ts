import { Router } from "express";
import { getReportPdfController, getReports, patchReportSign, postFinalReport } from "../controllers/reports.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth(), getReports);
router.get("/:id/pdf", requireAuth(), getReportPdfController);
router.post("/final/:stagiaireId", requireAuth(["TUTEUR", "ADMIN_RH", "RESPONSABLE_RH"]), postFinalReport);
router.patch("/:id/sign", requireAuth(["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"]), patchReportSign);

export default router;
