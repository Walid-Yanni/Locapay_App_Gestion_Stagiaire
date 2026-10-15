// scripts/ajouter-activites-demo.ts : ajoute des activités de démonstration au carnet d'un seul stagiaire
// (développement uniquement), pour exercer le fil du stage et le journal du Carnet.
// Par défaut, simulation : n'affiche que ce qui serait écrit.
// Usage : pnpm --filter @locapay/api exec tsx ../../scripts/ajouter-activites-demo.ts [--supprimer] [--confirmer]
//   (aucune option)        : simulation de l'ajout.
//   --confirmer            : ajoute réellement (refus si des activités de démo existent déjà).
//   --supprimer            : simulation du retrait des activités de démo.
//   --supprimer --confirmer : retire réellement les activités de démo, et elles seules.
// Une activité de démo est une activité de ce stagiaire dont la description se termine par « (démo) ».
// DATABASE_URL est lu par le client Prisma depuis apps/api/.env. Refus si la base n'est pas locale.
// Codes de sortie : 0 succès, 1 refus ou erreur.
import { PrismaClient, type ActivityCategory, type ActivityStatus } from "@prisma/client";
import { Refus, verifierBaseLocale } from "./base-locale.js";

const CIBLE = "faridath.lawson@stagiaire.locapay.bj";
const MARQUE = " (démo)";
const DAY_MS = 86_400_000;

interface EntreeDemo {
  /** Semaine du stage, à partir de 0 (semaine k = jours début + 7k à début + 7k + 6). */
  semaine: number;
  /** Jour dans la semaine, de 0 à 6. */
  jour: number;
  category: ActivityCategory;
  minutes: number;
  status: ActivityStatus;
  description: string;
  tutorComment?: string;
}

// Minutes VALIDEE par semaine (hors seed) : paliers 0, < 8 h, 8 à 20 h, >= 20 h tous représentés.
// Semaine 0 : 3 h · 1 : 14 h · 2 : 23 h · 3 : rien · 4 : 4 h · 5 : 22 h · 6 : 8 h · 9 : 13 h
// 10 : rien de visé · 11 : 6 h · 13 : 21 h · 14 : 5 h · 15 : en attente et brouillon seulement.
const PLAN: EntreeDemo[] = [
  { semaine: 0, jour: 0, category: "DOCUMENTATION", minutes: 180, status: "VALIDEE", description: "Lecture du dossier d'accueil et de la charte de conformité" },
  { semaine: 1, jour: 1, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Recensement des clauses de révision de loyer dans les baux en cours" },
  { semaine: 1, jour: 3, category: "DOCUMENTATION", minutes: 360, status: "VALIDEE", description: "Fiche de synthèse sur les obligations déclaratives des bailleurs" },
  { semaine: 2, jour: 0, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Contrôle d'un échantillon de 40 baux commerciaux" },
  { semaine: 2, jour: 1, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Suite du contrôle de l'échantillon : écarts de dépôt de garantie" },
  { semaine: 2, jour: 2, category: "DOCUMENTATION", minutes: 420, status: "VALIDEE", description: "Rédaction du rapport d'écarts de l'échantillon" },
  { semaine: 2, jour: 4, category: "REUNION", minutes: 60, status: "REJETEE", description: "Compte rendu de la réunion conformité", tutorComment: "Compte rendu incomplet : ajouter les décisions prises et les responsables." },
  { semaine: 4, jour: 2, category: "DEVELOPPEMENT", minutes: 240, status: "VALIDEE", description: "Tableau de suivi des renouvellements de baux" },
  { semaine: 4, jour: 3, category: "DOCUMENTATION", minutes: 180, status: "SOUMISE", description: "Procédure de relance des pièces manquantes" },
  { semaine: 5, jour: 0, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Audit des quittances émises au premier semestre" },
  { semaine: 5, jour: 2, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Rapprochement des quittances et des encaissements Mobile Money" },
  { semaine: 5, jour: 3, category: "DOCUMENTATION", minutes: 360, status: "VALIDEE", description: "Note sur les écarts de rapprochement" },
  { semaine: 5, jour: 4, category: "AUTRE", minutes: 90, status: "BROUILLON", description: "Brouillon de la note de synthèse mensuelle" },
  { semaine: 6, jour: 1, category: "FORMATION", minutes: 480, status: "VALIDEE", description: "Atelier interne sur la réglementation des loyers" },
  { semaine: 9, jour: 1, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Contrôle des mandats de gestion signés" },
  { semaine: 9, jour: 2, category: "DOCUMENTATION", minutes: 300, status: "VALIDEE", description: "Mise à jour du registre des mandats" },
  { semaine: 10, jour: 2, category: "DOCUMENTATION", minutes: 120, status: "REJETEE", description: "Modèle de lettre de mise en demeure", tutorComment: "Le ton est trop direct : reformuler avec le service juridique." },
  { semaine: 11, jour: 0, category: "DEVELOPPEMENT", minutes: 360, status: "VALIDEE", description: "Automatisation du contrôle des dates d'échéance dans le tableur" },
  { semaine: 11, jour: 2, category: "REUNION", minutes: 180, status: "SOUMISE", description: "Présentation des premiers résultats à l'équipe conformité" },
  { semaine: 13, jour: 0, category: "RECHERCHE", minutes: 480, status: "VALIDEE", description: "Revue des dossiers de contentieux locatifs" },
  { semaine: 13, jour: 1, category: "DOCUMENTATION", minutes: 480, status: "VALIDEE", description: "Cartographie des risques de non-conformité" },
  { semaine: 13, jour: 3, category: "FORMATION", minutes: 300, status: "VALIDEE", description: "Formation sur la protection des données des locataires" },
  { semaine: 14, jour: 2, category: "AUTRE", minutes: 90, status: "REJETEE", description: "Mise à jour de la cartographie des risques", tutorComment: "Il manque la colonne des mesures correctives." },
  { semaine: 14, jour: 3, category: "DOCUMENTATION", minutes: 300, status: "VALIDEE", description: "Fiche réflexe pour les contrôles de conformité" },
  { semaine: 15, jour: 0, category: "REUNION", minutes: 120, status: "SOUMISE", description: "Préparation de la soutenance avec le tuteur" },
  { semaine: 15, jour: 1, category: "DOCUMENTATION", minutes: 60, status: "BROUILLON", description: "Plan du rapport de fin de stage" },
];

function lireArguments(argv: string[]) {
  const connus = ["--confirmer", "--supprimer"];
  const inconnus = argv.filter((a) => !connus.includes(a));
  if (inconnus.length > 0) throw new Refus(`Arrêt : option inconnue : ${inconnus.join(" ")}. Options : ${connus.join(", ")}.`);
  return { confirmer: argv.includes("--confirmer"), supprimer: argv.includes("--supprimer") };
}

/** Minuit UTC d'un jour donné (jours calendaires, comme startDate / endDate). */
function minuitUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const jour = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const prisma = new PrismaClient();

async function trouverStagiaire() {
  const stagiaire = await prisma.stagiaire.findFirst({
    where: { user: { email: CIBLE } },
    select: { id: true, startDate: true, endDate: true, status: true },
  });
  if (!stagiaire) throw new Refus(`Arrêt : aucun stagiaire pour ${CIBLE}.`);
  return stagiaire;
}

const filtreDemo = (stagiaireId: string) => ({ stagiaireId, description: { endsWith: MARQUE } });

async function main() {
  // Arguments et hôte vérifiés avant toute requête, simulation comprise.
  const { confirmer, supprimer } = lireArguments(process.argv.slice(2));
  verifierBaseLocale();

  const stagiaire = await trouverStagiaire();
  const debut = minuitUtc(stagiaire.startDate);
  const fin = minuitUtc(stagiaire.endDate);
  const aujourdhui = minuitUtc(new Date());
  console.log(`Cible : ${CIBLE}  stage du ${jour(debut)} au ${jour(fin)}  statut ${stagiaire.status}`);

  const existantes = await prisma.activity.findMany({
    where: filtreDemo(stagiaire.id),
    select: { date: true, status: true, description: true },
    orderBy: { date: "asc" },
  });

  if (supprimer) {
    console.log(`${existantes.length} activité(s) de démo trouvée(s).`);
    if (!confirmer) {
      for (const a of existantes) console.log(`  ${jour(a.date.getTime())}  ${a.status.padEnd(9)}  ${a.description}`);
      console.log("\nSIMULATION : rien n'a été supprimé. Relance avec --supprimer --confirmer pour retirer.");
      return;
    }
    const { count } = await prisma.activity.deleteMany({ where: filtreDemo(stagiaire.id) });
    console.log(`\nSUPPRESSION effectuée : ${count} activité(s) de démo retirée(s).`);
    return;
  }

  // Dates en jours calendaires UTC, jamais avant le début, après la fin ni dans le futur.
  const limite = Math.min(fin, aujourdhui);
  const retenues: (EntreeDemo & { date: Date })[] = [];
  const ecartees: string[] = [];
  for (const e of PLAN) {
    const ms = debut + (e.semaine * 7 + e.jour) * DAY_MS;
    if (ms < debut || ms > limite) ecartees.push(`${jour(ms)}  ${e.description}`);
    else retenues.push({ ...e, date: new Date(ms) });
  }

  console.log(`${retenues.length} activité(s) à ajouter :`);
  for (const e of retenues) {
    console.log(`  ${jour(e.date.getTime())}  S${String(e.semaine + 1).padStart(2, "0")}  ${e.status.padEnd(9)}  ${String(e.minutes).padStart(3)} min  ${e.category.padEnd(13)}  ${e.description}${MARQUE}`);
  }
  if (ecartees.length > 0) {
    console.log(`\n${ecartees.length} entrée(s) écartée(s) (hors période ou dans le futur) :`);
    for (const l of ecartees) console.log(`  ${l}`);
  }

  if (existantes.length > 0) {
    throw new Refus(`Arrêt : ${existantes.length} activité(s) de démo existent déjà. Retire-les d'abord avec --supprimer --confirmer.`);
  }
  if (!confirmer) {
    console.log("\nSIMULATION : rien n'a été écrit. Relance avec --confirmer pour ajouter.");
    return;
  }

  // Revérifié juste avant l'écriture, dans la même transaction (script manuel, lancé une fois à la fois).
  const { count } = await prisma.$transaction(async (tx) => {
    const deja = await tx.activity.count({ where: filtreDemo(stagiaire.id) });
    if (deja > 0) throw new Refus(`Arrêt : ${deja} activité(s) de démo existent déjà.`);
    return tx.activity.createMany({
      data: retenues.map((e) => ({
        stagiaireId: stagiaire.id,
        date: e.date,
        category: e.category,
        description: e.description + MARQUE,
        durationMinutes: e.minutes,
        status: e.status,
        tutorComment: e.tutorComment ?? null,
      })),
    });
  });
  console.log(`\nAJOUT effectué : ${count} activité(s) de démo créée(s).`);
}

main()
  .catch((error) => {
    // Un refus n'affiche que son message ; toute autre erreur garde sa pile pour le diagnostic.
    console.error(error instanceof Refus ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
