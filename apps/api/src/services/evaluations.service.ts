import { prisma } from "../lib/prisma.js";

export async function listEvaluations(stagiaireId?: string) {
  return prisma.evaluation.findMany({
    where: { stagiaireId },
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
) {
  return prisma.evaluation.create({
    data: { ...input, evaluatorId },
    include: { stagiaire: { include: { user: true } }, evaluator: true },
  });
}
