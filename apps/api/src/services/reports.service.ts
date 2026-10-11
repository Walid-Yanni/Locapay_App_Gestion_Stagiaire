import puppeteer from "puppeteer";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { UserRole } from "@locapay/shared-types";

type Requester = { sub: string; role: UserRole };

export async function generateReportPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function getReportPdf(id: string, requester: Requester): Promise<{ filename: string; buffer: Buffer }> {
  const report = await prisma.report.findUnique({
    where: { id },
    include: { stagiaire: { include: { user: true } } },
  });
  if (!report || !report.html) throw new Error("Rapport introuvable ou contenu absent");
  if (requester.role === "STAGIAIRE" && report.stagiaire.userId !== requester.sub) throw new HttpError(403, "Ce rapport ne vous appartient pas");
  if (requester.role === "TUTEUR" && report.stagiaire.tutorId !== requester.sub) throw new HttpError(403, "Ce rapport n'appartient pas à un de vos stagiaires");
  const buffer = await generateReportPdf(report.html);
  return {
    filename: `rapport-${report.stagiaire.user.lastName.toLowerCase()}-${report.id.slice(0, 8)}.pdf`,
    buffer,
  };
}

export async function listReports(stagiaireId: string | undefined, requester: Requester) {
  // Les rapports sont toujours bornés au profil du stagiaire ou aux stagiaires du tuteur.
  const scope = requester.role === "STAGIAIRE"
    ? { stagiaire: { userId: requester.sub } }
    : requester.role === "TUTEUR"
      ? { stagiaire: { tutorId: requester.sub } }
      : {};
  return prisma.report.findMany({
    where: { ...(stagiaireId ? { stagiaireId } : {}), ...scope },
    include: { stagiaire: { include: { user: true, tutor: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function generateFinalReport(stagiaireId: string, requester?: Requester) {
  // La génération déclenchée par un tuteur reste limitée à ses stagiaires.
  if (requester?.role === "TUTEUR") {
    const profile = await prisma.stagiaire.findFirst({ where: { id: stagiaireId, tutorId: requester.sub } });
    if (!profile) throw new HttpError(403, "Ce stagiaire ne vous est pas attribué");
  }
  const existing = await prisma.report.findFirst({
    where: { stagiaireId, type: "FINAL" },
  });
  if (existing) return existing;

  const stagiaire = await prisma.stagiaire.findUnique({
    where: { id: stagiaireId },
    include: {
      user: true,
      tutor: true,
      activities: { where: { status: "VALIDEE" }, orderBy: { date: "asc" } },
      evaluations: { orderBy: { createdAt: "desc" } },
      skills: { include: { skill: true } },
    },
  });

  if (!stagiaire) throw new Error("Stagiaire introuvable");

  const totalMinutes = (stagiaire.activities as Array<{ durationMinutes: number }>).reduce(
    (total: number, activity: { durationMinutes: number }) => total + activity.durationMinutes,
    0,
  );
  const lastEvaluation = stagiaire.evaluations[0];
  const html = [
    `<h1>Rapport final de stage</h1>`,
    `<p><strong>Stagiaire:</strong> ${stagiaire.user.firstName} ${stagiaire.user.lastName}</p>`,
    `<p><strong>Sujet:</strong> ${stagiaire.subject}</p>`,
    `<p><strong>Service:</strong> ${stagiaire.service}</p>`,
    `<p><strong>Tuteur:</strong> ${stagiaire.tutor.firstName} ${stagiaire.tutor.lastName}</p>`,
    `<p><strong>Temps valide:</strong> ${Math.round(totalMinutes / 60)} heures</p>`,
    lastEvaluation ? `<p><strong>Evaluation:</strong> ${lastEvaluation.comment}</p>` : `<p>Aucune evaluation finale enregistree.</p>`,
  ].join("");

  const report = await prisma.report.create({
    data: {
      stagiaireId,
      type: "FINAL",
      status: "GENERE",
      title: `Rapport final - ${stagiaire.user.firstName} ${stagiaire.user.lastName}`,
      html,
      generatedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: stagiaire.tutorId,
      type: "REPORT_GENERATED",
      title: "Rapport final genere",
      message: `Le rapport final de ${stagiaire.user.firstName} ${stagiaire.user.lastName} est pret pour relecture.`,
    },
  });

  return report;
}

export async function signReport(id: string, requester: Requester) {
  // Chaque rôle ne peut modifier que son propre indicateur de signature.
  const report = await prisma.report.findUnique({ where: { id }, include: { stagiaire: true } });
  if (!report) throw new HttpError(404, "Rapport introuvable");
  if (requester.role === "STAGIAIRE" && report.stagiaire.userId !== requester.sub) throw new HttpError(403, "Ce rapport ne vous appartient pas");
  if (requester.role === "TUTEUR" && report.stagiaire.tutorId !== requester.sub) throw new HttpError(403, "Ce rapport n'appartient pas à un de vos stagiaires");

  const signature = requester.role === "STAGIAIRE"
    ? { signedByStagiaire: true }
    : requester.role === "TUTEUR"
      ? { signedByTutor: true }
      : { signedByRH: true };
  const allSigned = (report.signedByTutor || requester.role === "TUTEUR")
    && (report.signedByRH || requester.role === "ADMIN_RH" || requester.role === "RESPONSABLE_RH")
    && (report.signedByStagiaire || requester.role === "STAGIAIRE");
  return prisma.report.update({
    where: { id },
    data: { ...signature, status: allSigned ? "SIGNE" : "GENERE", signedAt: allSigned ? new Date() : null },
  });
}
