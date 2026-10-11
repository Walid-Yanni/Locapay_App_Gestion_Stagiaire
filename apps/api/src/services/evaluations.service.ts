import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { UserRole } from "@locapay/shared-types";

type Requester = { sub: string; role: UserRole };

export async function listEvaluations(stagiaireId: string | undefined, requester: Requester) {
  // Les résultats sont limités au profil du stagiaire ou aux stagiaires du tuteur.
  const scope = requester.role === "STAGIAIRE"
    ? { stagiaire: { userId: requester.sub } }
    : requester.role === "TUTEUR"
      ? { stagiaire: { tutorId: requester.sub } }
      : {};
  return prisma.evaluation.findMany({
    where: { ...(stagiaireId ? { stagiaireId } : {}), ...scope },
    include: { stagiaire: { include: { user: true } }, evaluator: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createEvaluation(
  evaluatorId: string,
  input: {
    stagiaireId: string;
    technicalScore: number;
    communicationScore: number;
    autonomyScore: number;
    punctualityScore: number;
    comment: string;
  },
  requester: Requester,
) {
  // Seuls les tuteurs peuvent évaluer un stagiaire qu'ils encadrent.
  if (requester.role === "TUTEUR") {
    const profile = await prisma.stagiaire.findFirst({ where: { id: input.stagiaireId, tutorId: requester.sub } });
    if (!profile) throw new HttpError(403, "Ce stagiaire ne vous est pas attribué");
  }
  return prisma.evaluation.create({
    data: { ...input, evaluatorId },
    include: { stagiaire: { include: { user: true } }, evaluator: true },
  });
}
