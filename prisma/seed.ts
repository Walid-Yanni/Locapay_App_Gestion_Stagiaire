import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { verifierBaseLocale } from "../scripts/base-locale.js";

const prisma = new PrismaClient();

async function main() {
  // Le seed VIDE toute la base puis crée des comptes au mot de passe commun : jamais hors base locale.
  verifierBaseLocale();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.stagiaireSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stagiaire.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("Locapay2026!", 10);

  const admin = await prisma.user.create({
    data: { email: "admin.rh@locapay.bj", password, firstName: "Nadia", lastName: "Kora", role: "ADMIN_RH" },
  });
  const rh = await prisma.user.create({
    data: { email: "responsable.rh@locapay.bj", password, firstName: "Mireille", lastName: "Sognon", role: "RESPONSABLE_RH" },
  });
  const tutor = await prisma.user.create({
    data: { email: "w.sacca@locapay.bj", password, firstName: "Walid", lastName: "Sacca", role: "TUTEUR" },
  });

  const skills = await Promise.all(
    [
      ["React", "Technique"],
      ["API REST", "Technique"],
      ["Communication", "Soft skills"],
      ["Rigueur", "Soft skills"],
    ].map(([name, category]) => prisma.skill.create({ data: { name, category } })),
  );

  const stagiairesData = [
    ["aicha.boni@stagiaire.locapay.bj", "Aicha", "Boni", "EPITECH Benin", "Genie Logiciel", "Licence 3", "Developpement du module de facturation", "Ingenierie logicielle"],
    ["jonas.houeto@stagiaire.locapay.bj", "Jonas", "Houeto", "ENEAM", "Finance digitale", "Master 1", "Analyse du recouvrement client", "Finance"],
    ["sarah.adjovi@stagiaire.locapay.bj", "Sarah", "Adjovi", "UAC", "Marketing", "Licence 2", "Parcours d'onboarding digital", "Experience client"],
    ["marc.houndete@stagiaire.locapay.bj", "Marc", "Houndete", "IFRI - UAC", "Informatique & Reseaux", "Master 1", "Optimisation de l'infrastructure Cloud", "Ingenierie logicielle"],
    ["faridath.lawson@stagiaire.locapay.bj", "Faridath", "Lawson", "Pigier Benin", "Audit et Controle", "Master 2", "Controle interne et conformite des baux", "Juridique & Conformite"],
    ["kevin.dossou@stagiaire.locapay.bj", "Kevin", "Dossou", "ESGIS", "Cybersecurite", "Licence 3", "Audit de securite des paiements", "Ingenierie logicielle"],
  ] as const;

  for (const [index, data] of stagiairesData.entries()) {
    const [email, firstName, lastName, school, fieldOfStudy, level, subject, service] = data;
    const user = await prisma.user.create({ data: { email, password, firstName, lastName, role: "STAGIAIRE" } });
    const startMonth = String((index % 6) + 3).padStart(2, "0");
    const endMonth = String((index % 6) + 6).padStart(2, "0");
    const stagiaire = await prisma.stagiaire.create({
      data: {
        userId: user.id,
        tutorId: tutor.id,
        school,
        fieldOfStudy,
        level,
        startDate: new Date(`2026-${startMonth}-01T00:00:00.000Z`),
        endDate: new Date(`2026-${endMonth}-28T00:00:00.000Z`),
        typeStage: index === 0 ? "PROFESSIONNEL" : "OBLIGATOIRE",
        subject,
        service,
        status: "EN_COURS",
      },
    });

    await prisma.activity.createMany({
      data: [
        {
          stagiaireId: stagiaire.id,
          date: new Date("2026-08-17T08:00:00.000Z"),
          category: "DEVELOPPEMENT",
          description: "Integration d'un ecran de suivi avec filtres par statut.",
          durationMinutes: 240,
          status: "VALIDEE",
        },
        {
          stagiaireId: stagiaire.id,
          date: new Date("2026-08-20T09:00:00.000Z"),
          category: "REUNION",
          description: "Point hebdomadaire avec le tuteur et priorisation des livrables.",
          durationMinutes: 90,
          status: index === 0 ? "SOUMISE" : "VALIDEE",
        },
      ],
    });

    await prisma.evaluation.create({
      data: {
        stagiaireId: stagiaire.id,
        evaluatorId: tutor.id,
        technicalScore: 4,
        communicationScore: 4,
        autonomyScore: 3 + index,
        punctualityScore: 5,
        comment: "Bonne progression, livrables propres et implication constante.",
      },
    });

    await prisma.stagiaireSkill.createMany({
      data: skills.slice(0, 3).map((skill, skillIndex) => ({
        stagiaireId: stagiaire.id,
        skillId: skill.id,
        level: 3 + ((index + skillIndex) % 3),
        validatedAt: new Date("2026-08-22T10:00:00.000Z"),
      })),
    });
  }

  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: "INFO", title: "Tableau RH pret", message: "Les donnees de demonstration sont disponibles." },
      { userId: rh.id, type: "STAGE_ENDING", title: "Fin de stage proche", message: "Trois stages arrivent a echeance ce mois-ci." },
      { userId: tutor.id, type: "ACTIVITY_SUBMITTED", title: "Activite a valider", message: "Aicha a soumis une nouvelle activite." },
    ],
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
