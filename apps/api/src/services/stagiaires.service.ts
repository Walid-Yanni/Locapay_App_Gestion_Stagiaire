import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { UserRole } from "@locapay/shared-types";

type Requester = { sub: string; role: UserRole };

export async function listStagiaires(filters: { status?: string; service?: string; tutorId?: string }, requester: Requester) {
  // La portée est imposée par l'identité ; tutorId reste un filtre réservé aux RH.
  const scope = requester.role === "STAGIAIRE"
    ? { userId: requester.sub }
    : requester.role === "TUTEUR"
      ? { tutorId: requester.sub }
      : { tutorId: filters.tutorId };
  return prisma.stagiaire.findMany({
    where: {
      status: filters.status as never,
      service: filters.service,
      ...scope,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
      tutor: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
      activities: true,
      evaluations: true,
      reports: true,
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getStagiaire(id: string, requester: Requester) {
  // Un détail de stagiaire est accessible seulement dans la portée de l'appelant.
  const scope = requester.role === "STAGIAIRE"
    ? { userId: requester.sub }
    : requester.role === "TUTEUR"
      ? { tutorId: requester.sub }
      : {};
  return prisma.stagiaire.findUnique({
    where: { id, ...scope },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
      tutor: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
      activities: { orderBy: { date: "desc" } },
      evaluations: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } },
      skills: { include: { skill: true } },
      documents: true,
    },
  });
}

export async function createStagiaire(input: {
  email: string;
  firstName: string;
  lastName: string;
  tutorId: string;
  school: string;
  fieldOfStudy: string;
  level: string;
  startDate: string;
  endDate: string;
  typeStage: "OBLIGATOIRE" | "INITIATION" | "PROFESSIONNEL";
  subject: string;
  service: string;
}, _requester: Requester) {
  const tutor = await prisma.user.findUnique({ where: { id: input.tutorId }, select: { role: true, isActive: true } });
  if (!tutor || tutor.role !== "TUTEUR" || !tutor.isActive) {
    throw new HttpError(400, "Le tuteur indiqué n'existe pas, n'a pas le rôle TUTEUR ou n'est pas actif");
  }
  const temporaryPassword = randomBytes(9).toString("base64url");
  const password = await bcrypt.hash(temporaryPassword, 10);
  const stagiaire = await prisma.stagiaire.create({
    data: {
      user: {
        create: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          password,
          role: "STAGIAIRE",
          mustChangePassword: true,
        },
      },
      tutor: { connect: { id: input.tutorId } },
      school: input.school,
      fieldOfStudy: input.fieldOfStudy,
      level: input.level,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      typeStage: input.typeStage,
      subject: input.subject,
      service: input.service,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, mustChangePassword: true } },
      tutor: true,
    },
  });
  return { stagiaire, temporaryPassword };
}
