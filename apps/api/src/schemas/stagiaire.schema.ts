import { z } from "zod";

export const createStagiaireSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  tutorId: z.string().min(1),
  school: z.string().min(2),
  fieldOfStudy: z.string().min(2),
  level: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  typeStage: z.enum(["OBLIGATOIRE", "INITIATION", "PROFESSIONNEL"]),
  subject: z.string().min(3),
  service: z.string().min(2),
});
