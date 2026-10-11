import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { HttpError } from "../lib/http-error.js";
import { generateFinalReport, getReportPdf, listReports, signReport } from "../services/reports.service.js";

export async function getReports(req: AuthenticatedRequest, res: Response) {
  const stagiaireId = Array.isArray(req.query.stagiaireId) ? req.query.stagiaireId[0] : req.query.stagiaireId;
  res.json(await listReports(stagiaireId ? String(stagiaireId) : undefined, req.user!));
}

export async function postFinalReport(req: AuthenticatedRequest, res: Response) {
  res.status(201).json(await generateFinalReport(String(req.params.stagiaireId), req.user!));
}

export async function patchReportSign(req: AuthenticatedRequest, res: Response) {
  res.json(await signReport(String(req.params.id), req.user!));
}

export async function getReportPdfController(req: AuthenticatedRequest, res: Response) {
  try {
    const { filename, buffer } = await getReportPdf(String(req.params.id), req.user!);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Erreur generation PDF" });
  }
}

