import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";

export async function listStagiaires(filters: { status?: string; service?: string; tutorId?: string }) {
  return prisma.stagiaire.findMany({
    where: {
      status: filters.status as never,
      service: filters.service,
      tutorId: filters.tutorId,
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

export async function getStagiaire(id: string) {
  return prisma.stagiaire.findUnique({
    where: { id },
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
  password: string;
  tutorId: string;
  school: string;
  fieldOfStudy: string;
  level: string;
  startDate: string;
  endDate: string;
  typeStage: "OBLIGATOIRE" | "INITIATION" | "PROFESSIONNEL";
  subject: string;
  service: string;
}) {
  const password = await bcrypt.hash(input.password, 10);
  return prisma.stagiaire.create({
    data: {
      user: {
        create: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          password,
          role: "STAGIAIRE",
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
    include: { user: true, tutor: true },
  });
}
