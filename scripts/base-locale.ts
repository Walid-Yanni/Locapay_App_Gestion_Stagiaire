// scripts/base-locale.ts : garde commune des scripts de développement qui écrivent en base.
// DATABASE_URL est lu par le client Prisma depuis apps/api/.env : instancier PrismaClient avant d'appeler la garde.

const HOTES_LOCAUX = ["localhost", "127.0.0.1", "::1"];

/** Refus attendu : le script n'affiche que son message, sans pile. */
export class Refus extends Error {}

// N'affiche jamais l'URL ni ses identifiants : seulement l'hôte quand il est refusé.
export function verifierBaseLocale() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Refus("Arrêt : DATABASE_URL est absent, impossible de vérifier que la base est locale.");
  let hote: string;
  try {
    hote = new URL(url).hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  } catch {
    throw new Refus("Arrêt : DATABASE_URL n'est pas une URL lisible, impossible de vérifier que la base est locale.");
  }
  if (!HOTES_LOCAUX.includes(hote)) {
    throw new Refus(`Arrêt : la base visée n'est pas locale (hôte « ${hote || "vide"} »). Ce script ne s'utilise que sur une base de développement locale.`);
  }
}
