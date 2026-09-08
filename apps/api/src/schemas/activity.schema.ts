import { z } from "zod";

export const createActivitySchema = z.object({
  stagiaireId: z.string().min(1),
  date: z.string().datetime(),
  category: z.enum(["DEVELOPPEMENT", "REUNION", "FORMATION", "RECHERCHE", "DOCUMENTATION", "AUTRE"]),
  description: z.string().min(3),
  durationMinutes: z.number().int().positive(),
});

export const reviewActivitySchema = z.object({
  status: z.enum(["VALIDEE", "REJETEE"]),
  tutorComment: z.string().optional(),
});
