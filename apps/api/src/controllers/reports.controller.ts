import type { Request, Response } from "express";
import { generateFinalReport, getReportPdf, listReports, signReport } from "../services/reports.service.js";

export async function getReports(req: Request, res: Response) {
  const stagiaireId = Array.isArray(req.query.stagiaireId) ? req.query.stagiaireId[0] : req.query.stagiaireId;
  res.json(await listReports(stagiaireId ? String(stagiaireId) : undefined));
}

export async function postFinalReport(req: Request, res: Response) {
  res.status(201).json(await generateFinalReport(String(req.params.stagiaireId)));
}

export async function patchReportSign(req: Request, res: Response) {
  res.json(await signReport(String(req.params.id)));
}

export async function getReportPdfController(req: Request, res: Response) {
  try {
    const { filename, buffer } = await getReportPdf(String(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ message: error instanceof Error ? error.message : "Erreur generation PDF" });
  }
}

