import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { UserRole } from "@locapay/shared-types";

type Requester = { sub: string; role: UserRole };

export async function listActivities(stagiaireId: string | undefined, requester: Requester) {
  // Les stagiaires voient uniquement leurs activités et les tuteurs celles de leurs stagiaires.
  const scope = requester.role === "STAGIAIRE"
    ? { stagiaire: { userId: requester.sub } }
    : requester.role === "TUTEUR"
      ? { stagiaire: { tutorId: requester.sub } }
      : {};
  return prisma.activity.findMany({
    where: { ...(stagiaireId ? { stagiaireId } : {}), ...scope },
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
}, requester: Requester) {
  // Un stagiaire ne peut créer une activité que pour son propre profil.
  if (requester.role === "STAGIAIRE") {
    const profile = await prisma.stagiaire.findUnique({ where: { userId: requester.sub } });
    if (!profile) throw new HttpError(403, "Profil stagiaire introuvable");
    if (input.stagiaireId !== profile.id) throw new HttpError(403, "Vous ne pouvez créer une activité que pour votre profil");
  }
  if (requester.role === "TUTEUR") {
    const profile = await prisma.stagiaire.findFirst({ where: { id: input.stagiaireId, tutorId: requester.sub } });
    if (!profile) throw new HttpError(403, "Ce stagiaire ne vous est pas attribué");
  }
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

export async function reviewActivity(id: string, input: { status: "VALIDEE" | "REJETEE"; tutorComment?: string }, requester: Requester) {
  // La revue d'un tuteur est limitée aux activités de ses stagiaires.
  if (requester.role === "TUTEUR") {
    const activity = await prisma.activity.findFirst({ where: { id, stagiaire: { tutorId: requester.sub } } });
    if (!activity) throw new HttpError(403, "Cette activité n'appartient pas à un de vos stagiaires");
  }
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
