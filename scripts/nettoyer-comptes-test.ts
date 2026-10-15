// scripts/nettoyer-comptes-test.ts : supprime les comptes de test créés par check-securite.sh
// (développement uniquement). Par défaut, simulation : n'affiche que ce qui serait supprimé.
// Usage : pnpm --filter @locapay/api exec tsx ../../scripts/nettoyer-comptes-test.ts [--email <adresse>] [--confirmer]
//   --email <adresse> : ne vise que ce compte (test.mdp.* ou test.dates.* en @stagiaire.locapay.bj).
//   --confirmer       : supprime réellement ; sans lui, simulation, même avec --email.
// DATABASE_URL est lu par le client Prisma depuis apps/api/.env. Refus si la base n'est pas locale.
// Codes de sortie : 0 succès, 1 refus ou erreur, 3 compte visé par --email introuvable.
import { Prisma, PrismaClient } from "@prisma/client";
import { Refus, verifierBaseLocale } from "./base-locale.js";

const DOMAINE = "@stagiaire.locapay.bj";
const PREFIXES = ["test.mdp.", "test.dates."];

// Comptes à ne jamais toucher : les 9 du seed et 5 comptes créés depuis l'interface.
const PROTEGES = [
  "admin.rh@locapay.bj",
  "responsable.rh@locapay.bj",
  "w.sacca@locapay.bj",
  "aicha.boni@stagiaire.locapay.bj",
  "faridath.lawson@stagiaire.locapay.bj",
  "jonas.houeto@stagiaire.locapay.bj",
  "kevin.dossou@stagiaire.locapay.bj",
  "marc.houndete@stagiaire.locapay.bj",
  "sarah.adjovi@stagiaire.locapay.bj",
  "livai0471@gmail.com",
  "mougiraibine@gmail.com",
  "Stagiaire2@gmail.com",
  "Stagiaire3@gmail.com",
  "Stagiairestest@gmail.com",
].map((email) => email.toLowerCase());

const INTROUVABLE = 3;

function lireArguments(argv: string[]) {
  const confirmer = argv.includes("--confirmer");
  const i = argv.indexOf("--email");
  if (i === -1) return { confirmer, email: undefined };
  const email = argv[i + 1];
  if (!email || email.startsWith("--")) throw new Refus("Arrêt : --email attend une adresse.");
  const conforme = email.endsWith(DOMAINE) && PREFIXES.some((p) => email.startsWith(p) && email.length > p.length + DOMAINE.length);
  if (!conforme) {
    throw new Refus(`Arrêt : ${email} ne correspond pas à ${PREFIXES.map((p) => p + "*" + DOMAINE).join(" ou ")}.`);
  }
  return { confirmer, email };
}

const prisma = new PrismaClient();

type Client = PrismaClient | Prisma.TransactionClient;

// startsWith / endsWith : Prisma échappe % et _, aucun joker SQL possible.
async function selectionner(db: Client, email?: string) {
  const users = await db.user.findMany({
    where: {
      OR: PREFIXES.map((prefix) => ({ email: { startsWith: prefix, endsWith: DOMAINE } })),
      ...(email ? { email } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      stagiaireProfile: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const interdits = users.filter((u) => PROTEGES.includes(u.email.toLowerCase()));
  if (interdits.length > 0) {
    throw new Refus(`Arrêt : comptes protégés dans la sélection : ${interdits.map((u) => u.email).join(", ")}`);
  }

  const userIds = users.map((u) => u.id);
  const stagiaireIds = users.flatMap((u) => (u.stagiaireProfile ? [u.stagiaireProfile.id] : []));

  // Un compte de test ne doit être ni tuteur, ni évaluateur, ni propriétaire d'un document d'autrui :
  // ces liens n'ont pas de cascade et pointeraient vers des données réelles.
  const bloquants = {
    tuteur: await db.stagiaire.count({ where: { tutorId: { in: userIds } } }),
    evaluateur: await db.evaluation.count({ where: { evaluatorId: { in: userIds }, stagiaireId: { notIn: stagiaireIds } } }),
    proprietaire: await db.document.count({ where: { ownerId: { in: userIds }, stagiaireId: { notIn: stagiaireIds } } }),
  };
  if (bloquants.tuteur + bloquants.evaluateur + bloquants.proprietaire > 0) {
    throw new Refus(`Arrêt : comptes de test liés à d'autres stagiaires : ${JSON.stringify(bloquants)}`);
  }

  return { users, userIds, stagiaireIds };
}

async function main() {
  // Arguments et hôte vérifiés avant toute requête, simulation comprise.
  const { confirmer, email } = lireArguments(process.argv.slice(2));
  verifierBaseLocale();

  const { users, userIds, stagiaireIds } = await selectionner(prisma, email);
  const cible = email ?? PREFIXES.map((p) => p + "*" + DOMAINE).join(", ");
  console.log(`${users.length} compte(s) sélectionné(s) (${cible}) :`);
  for (const u of users) console.log(`  ${u.email}  ${u.firstName} ${u.lastName}  ${u.role}`);
  if (email && users.length === 0) {
    console.log("Compte introuvable : rien à supprimer.");
    process.exitCode = INTROUVABLE;
    return;
  }

  const rapports = await prisma.report.findMany({
    where: { stagiaireId: { in: stagiaireIds } },
    select: { id: true, type: true, status: true, createdAt: true, stagiaire: { select: { user: { select: { email: true } } } } },
  });
  if (rapports.length > 0) {
    console.log("\nRapports concernés :");
    for (const r of rapports) {
      console.log(`  ${r.stagiaire.user.email}  type=${r.type}  statut=${r.status}  créé le ${r.createdAt.toISOString()}`);
    }
  }

  const parStagiaire = { stagiaireId: { in: stagiaireIds } };
  if (!confirmer) {
    const prevision = {
      Activity: await prisma.activity.count({ where: parStagiaire }),
      Evaluation: await prisma.evaluation.count({ where: parStagiaire }),
      Report: await prisma.report.count({ where: parStagiaire }),
      StagiaireSkill: await prisma.stagiaireSkill.count({ where: parStagiaire }),
      Document: await prisma.document.count({ where: parStagiaire }),
      Notification: await prisma.notification.count({ where: { userId: { in: userIds } } }),
      Stagiaire: stagiaireIds.length,
      User: userIds.length,
    };
    console.log("\nSIMULATION : rien n'a été supprimé. Lignes qui seraient supprimées :");
    console.table(prevision);
    console.log("Relance avec --confirmer pour supprimer.");
    return;
  }

  // La sélection est refaite dans la transaction : on supprime exactement ce qui a été revérifié.
  const supprime = await prisma.$transaction(async (tx) => {
    const sel = await selectionner(tx, email);
    const where = { stagiaireId: { in: sel.stagiaireIds } };
    return {
      Activity: (await tx.activity.deleteMany({ where })).count,
      Evaluation: (await tx.evaluation.deleteMany({ where })).count,
      Report: (await tx.report.deleteMany({ where })).count,
      StagiaireSkill: (await tx.stagiaireSkill.deleteMany({ where })).count,
      Document: (await tx.document.deleteMany({ where })).count,
      Notification: (await tx.notification.deleteMany({ where: { userId: { in: sel.userIds } } })).count,
      Stagiaire: (await tx.stagiaire.deleteMany({ where: { id: { in: sel.stagiaireIds } } })).count,
      User: (await tx.user.deleteMany({ where: { id: { in: sel.userIds } } })).count,
    };
  });
  console.log("\nSUPPRESSION effectuée. Lignes supprimées par table :");
  console.table(supprime);
}

main()
  .catch((error) => {
    // Un refus n'affiche que son message ; toute autre erreur garde sa pile pour le diagnostic.
    console.error(error instanceof Refus ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
