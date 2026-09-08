import { prisma } from "../lib/prisma.js";

export async function listActivities(stagiaireId?: string) {
  return prisma.activity.findMany({
    where: { stagiaireId },
    include: { stagiaire: { include: { user: true } } },
    orderBy: { date: "desc" },
  });
}

export async function createActivity(input: {
  stagiaireId: string;
  date: string;
  category: "DEVELOPPEMENT" | "REUNION" | "FORMATION" | "RECHERCHE" | "DOCUMENTATION" | "AUTRE";
  description: string;
  durationMinutes: number;
}) {
  const activity = await prisma.activity.create({
    data: {
      ...input,
      date: new Date(input.date),
      status: "SOUMISE",
    },
    include: { stagiaire: true },
  });

  await prisma.notification.create({
    data: {
      userId: activity.stagiaire.tutorId,
      type: "ACTIVITY_SUBMITTED",
      title: "Nouvelle activite soumise",
      message: "Une activite attend votre validation.",
    },
  });

  return activity;
}

export async function reviewActivity(id: string, input: { status: "VALIDEE" | "REJETEE"; tutorComment?: string }) {
  const activity = await prisma.activity.update({
    where: { id },
    data: input,
    include: { stagiaire: true },
  });

  await prisma.notification.create({
    data: {
      userId: activity.stagiaire.userId,
      type: "ACTIVITY_VALIDATED",
      title: input.status === "VALIDEE" ? "Activite validee" : "Activite rejetee",
      message: input.tutorComment ?? "Votre tuteur a traite une activite.",
    },
  });

  return activity;
}
