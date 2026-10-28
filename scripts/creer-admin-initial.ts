// scripts/creer-admin-initial.ts : crée un compte du personnel (ADMIN_RH par défaut, ou RESPONSABLE_RH / TUTEUR)
// dans une base de production vide. L'application ne crée que des stagiaires : sans ce script, pas de tuteur.
// Le seed n'est jamais utilisé en production (il vide la base et crée des comptes au mot de passe commun).
// Par défaut, simulation : n'écrit rien. Avec --confirmer, crée le compte et affiche UNE SEULE FOIS un
// mot de passe temporaire ; le compte devra le changer à la première connexion.
// Usage : tsx scripts/creer-admin-initial.ts --email <adresse> --prenom <prénom> --nom <nom> [--role ADMIN_RH|RESPONSABLE_RH|TUTEUR] [--confirmer]
// Codes de sortie : 0 succès, 1 refus ou erreur.
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { generateTemporaryPassword } from "../apps/api/src/lib/temporary-password.js";

class Refus extends Error {}

function lireArguments(argv: string[]) {
  const connus = ["--email", "--prenom", "--nom", "--role", "--confirmer"];
  const valeurs: Record<string, string> = {};
  let confirmer = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!connus.includes(a)) throw new Refus(`Arrêt : option inconnue : ${a}.`);
    if (a === "--confirmer") {
      confirmer = true;
      continue;
    }
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) throw new Refus(`Arrêt : ${a} attend une valeur.`);
    valeurs[a] = v;
    i += 1;
  }
  const email = valeurs["--email"]?.trim().toLowerCase();
  const prenom = valeurs["--prenom"]?.trim();
  const nom = valeurs["--nom"]?.trim();
  if (!email || !prenom || !nom) throw new Refus("Arrêt : --email, --prenom et --nom sont obligatoires.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Refus(`Arrêt : « ${email} » n'est pas une adresse e-mail valide.`);
  const ROLES = ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR"] as const;
  const role = (valeurs["--role"] ?? "ADMIN_RH") as (typeof ROLES)[number];
  if (!ROLES.includes(role)) throw new Refus(`Arrêt : --role doit valoir ${ROLES.join(", ")} (reçu « ${valeurs["--role"]} »).`);
  return { email, prenom, nom, role, confirmer };
}

const prisma = new PrismaClient();

async function main() {
  const { email, prenom, nom, role, confirmer } = lireArguments(process.argv.slice(2));

  const existant = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existant) throw new Refus(`Arrêt : un compte existe déjà avec l'adresse ${email}.`);
  const memeRole = await prisma.user.count({ where: { role } });
  console.log(`Comptes ${role} existants : ${memeRole}.`);
  console.log(`Compte à créer : ${prenom} ${nom} <${email}> (${role}, changement de mot de passe obligatoire).`);

  if (!confirmer) {
    console.log("\nSIMULATION : rien n'a été écrit. Relance avec --confirmer pour créer le compte.");
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  const password = await bcrypt.hash(temporaryPassword, 10);
  await prisma.user.create({
    data: { email, password, firstName: prenom, lastName: nom, role, mustChangePassword: true },
  });
  console.log("\nCompte créé. Mot de passe temporaire (affiché une seule fois, à transmettre en main propre) :");
  console.log(`  ${temporaryPassword}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Refus ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
