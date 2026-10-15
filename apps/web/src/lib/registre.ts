// apps/web/src/lib/registre.ts
// Logique pure du « Registre des stagiaires » : aucun appel réseau, aucun React.
// Tout ce qui est calculé ici vient des données déjà chargées par l'API.
import type { Activity, ActivityStatus, Report, Stagiaire } from "@locapay/shared-types";

/** Nombre de perles affichées dans la colonne « Parcours ». */
export const BEADS = 10;

const DAY_MS = 86_400_000;

/** Avancement du stage entre 0 et 1, calculé à partir des dates de début et de fin. */
export function stageProgress(
  s: Pick<Stagiaire, "startDate" | "endDate" | "status">,
  now: Date = new Date(),
): number {
  if (s.status === "TERMINE") return 1;
  const start = new Date(s.startDate).getTime();
  const end = new Date(s.endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

/** Nombre de perles pleines pour un avancement donné (0 à BEADS). */
export function filledBeads(progress: number): number {
  return Math.round(progress * BEADS);
}

type ActivityWithStamp = Activity & { createdAt?: string };

/** Horodatage le plus précis disponible : createdAt si l'API le renvoie, sinon la date de l'activité. */
function stampOf(a: ActivityWithStamp): number {
  return new Date(a.createdAt ?? a.date).getTime();
}

/** Dernière activité de chaque stagiaire, indexée par stagiaireId. */
export function lastActivityByStagiaire(activities: Activity[]): Map<string, Activity> {
  const map = new Map<string, Activity>();
  for (const a of activities) {
    const current = map.get(a.stagiaireId);
    if (!current || stampOf(a) > stampOf(current)) map.set(a.stagiaireId, a);
  }
  return map;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** « Il y a 12 min », « Il y a 3 h », « Hier », « Il y a 4 j », ou la date au-delà de 30 jours. */
export function relativeLabel(a: Activity, now: Date = new Date()): string {
  const withStamp = a as ActivityWithStamp;

  // Précis à la minute seulement si l'API fournit createdAt.
  if (withStamp.createdAt) {
    const diffMin = Math.floor((now.getTime() - new Date(withStamp.createdAt).getTime()) / 60_000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffMin < 24 * 60) return `Il y a ${Math.floor(diffMin / 60)} h`;
  }

  // Sinon (ou au-delà d'un jour) : comparaison en jours calendaires.
  const days = Math.round((startOfDay(now) - startOfDay(new Date(withStamp.createdAt ?? a.date))) / DAY_MS);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days <= 30) return `Il y a ${days} j`;
  return new Date(withStamp.createdAt ?? a.date).toLocaleDateString("fr-FR");
}

export type VisaKey = "vise" | "attente" | "revoir" | "brouillon" | "termine" | "annule" | "vide";
export interface Visa {
  key: VisaKey;
  label: string;
}

/**
 * Table de correspondance entre les statuts du backend (inchangés) et le vocabulaire de l'interface.
 * Le statut du stage prime : un stage terminé ou annulé n'affiche plus le visa de sa dernière activité.
 */
export function visaOf(s: Pick<Stagiaire, "status">, last?: Activity): Visa {
  if (s.status === "ANNULE") return { key: "annule", label: "Annulé" };
  if (s.status === "TERMINE") return { key: "termine", label: "Terminé" };
  if (!last) return { key: "vide", label: "Aucune entrée" };
  return activityVisa(last.status);
}

/** Vocabulaire d'interface d'un statut d'activité (DESIGN.md §6), partagé par le Registre et le Carnet. */
export function activityVisa(status: ActivityStatus): Visa {
  switch (status) {
    case "VALIDEE":
      return { key: "vise", label: "Visé" };
    case "SOUMISE":
      return { key: "attente", label: "En attente" };
    case "REJETEE":
      return { key: "revoir", label: "À revoir" };
    default:
      return { key: "brouillon", label: "Brouillon" };
  }
}

export interface RegistreStatsData {
  enPoste: number;
  entreesSemaine: number;
  visasEnAttente: number;
  rapportsASigner: number;
}

export function registreStats(
  stagiaires: Stagiaire[],
  activities: Activity[],
  reports: Report[],
  now: Date = new Date(),
): RegistreStatsData {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  return {
    enPoste: stagiaires.filter((s) => s.status === "EN_COURS").length,
    entreesSemaine: activities.filter((a) => stampOf(a) >= weekAgo).length,
    visasEnAttente: activities.filter((a) => a.status === "SOUMISE").length,
    // Un rapport « à signer » est un rapport généré qui n'a pas encore été signé.
    rapportsASigner: reports.filter((r) => r.status === "GENERE").length,
  };
}

export function initialsOf(s: Stagiaire): string {
  const f = s.user?.firstName?.[0] ?? "";
  const l = s.user?.lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}
