import { z } from "zod";

const score = z.number().int().min(1).max(5);

export const createEvaluationSchema = z.object({
  stagiaireId: z.string().min(1),
  technicalScore: score,
  communicationScore: score,
  autonomyScore: score,
  punctualityScore: score,
  comment: z.string().min(3),
});
