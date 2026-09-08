import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { generateFinalReport } from "../services/reports.service.js";

export function scheduleEndOfCycleReports() {
  cron.schedule("0 2 * * *", async () => {
    const dueStagiaires = await prisma.stagiaire.findMany({
      where: {
        status: "EN_COURS",
        endDate: { lte: new Date() },
        reports: { none: { type: "FINAL" } },
      },
    });

    for (const stagiaire of dueStagiaires) {
      await generateFinalReport(stagiaire.id);
      await prisma.stagiaire.update({
        where: { id: stagiaire.id },
        data: { status: "TERMINE" },
      });
    }
  });
}
