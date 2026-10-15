// apps/web/src/lib/carnet.ts
// Logique pure du « Carnet de stage » : aucun appel réseau, aucun React.
// Les jours sont manipulés au format AAAA-MM-JJ et comptés en UTC : startDate et endDate
// sont stockées à minuit UTC (voir lib/dates.ts), le jour d'une activité est son jour UTC.
import type {
  Activity,
  ActivityCategory,
  Report,
  ReportType,
  Stagiaire,
  StagiaireSkill,
  UserRole,
} from "@locapay/shared-types";

/** Réponse de GET /api/stagiaires/:id telle que le Carnet l'utilise. */
export type StagiaireDetail = Stagiaire & {
  activities: Activity[];
  reports: Report[];
  skills: StagiaireSkill[];
};

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Jour calendaire (AAAA-MM-JJ) d'une date ISO renvoyée par l'API, lu en UTC. */
export function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Numéro de jour depuis le 1er janvier 1970 (UTC), ou null si le format est invalide. */
function dayNumber(day: string): number | null {
  const match = DAY_PATTERN.exec(day);
  if (!match) return null;
  const [, y, m, d] = match;
  return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d)) / DAY_MS);
}

// ---------- Adresse du carnet (#carnet/<id>) ----------

/** Forme des identifiants Prisma (cuid) : « c » suivi de 24 caractères minuscules ou chiffres. */
const STAGIAIRE_ID_PATTERN = /^c[a-z0-9]{24}$/;

export type CarnetHash = { kind: "aucun" } | { kind: "carnet"; id: string } | { kind: "invalide" };

/** Lit le hash de l'URL. Un hash « #carnet/... » dont l'id n'a pas la bonne forme est « invalide ». */
export function parseCarnetHash(hash: string): CarnetHash {
  if (!hash.startsWith("#carnet")) return { kind: "aucun" };
  const id = hash.startsWith("#carnet/") ? hash.slice("#carnet/".length) : "";
  return STAGIAIRE_ID_PATTERN.test(id) ? { kind: "carnet", id } : { kind: "invalide" };
}

export function carnetHash(id: string): string {
  return `#carnet/${id}`;
}

// ---------- Le fil du stage ----------

/** Paliers d'intensité d'une semaine, en minutes d'activités visées (VALIDEE). */
export const PALIER_FAIBLE_MAX_MIN = 8 * 60; // en dessous : semaine légère
export const PALIER_FORT_MIN = 20 * 60; // à partir de : semaine chargée

/** 0 : aucun travail visé ; 1 : moins de 8 h ; 2 : de 8 h à moins de 20 h ; 3 : 20 h et plus. */
export type Intensite = 0 | 1 | 2 | 3;

export function intensite(minutes: number): Intensite {
  if (minutes <= 0) return 0;
  if (minutes < PALIER_FAIBLE_MAX_MIN) return 1;
  if (minutes < PALIER_FORT_MIN) return 2;
  return 3;
}

export type PhaseStage = "avant" | "en_cours" | "termine" | "annule" | "incoherent";

export interface SemaineFil {
  /** Numéro de semaine, à partir de 1. */
  numero: number;
  minutes: number;
  intensite: Intensite;
  etat: "passee" | "courante" | "future";
}

export interface FilDuStage {
  phase: PhaseStage;
  /** Nombre total de semaines (Y). 0 si la période est incohérente. */
  total: number;
  /** Semaine en cours (X), seulement pendant le stage. */
  courante: number | null;
  semaines: SemaineFil[];
  /** Nombre de semaines contenant au moins une activité visée. */
  semainesAvecTravail: number;
}

/**
 * Découpe le stage en semaines relatives à son début (semaine k = jours début + 7k à début + 7k + 6)
 * et additionne, pour chacune, les minutes des activités VALIDEE. Les activités hors période sont ignorées.
 */
export function filDuStage(
  s: Pick<Stagiaire, "startDate" | "endDate" | "status">,
  activities: Pick<Activity, "date" | "status" | "durationMinutes">[],
  today: string,
): FilDuStage {
  const start = dayNumber(isoDay(s.startDate));
  const end = dayNumber(isoDay(s.endDate));
  const now = dayNumber(today);
  if (start === null || end === null || now === null || end < start) {
    return { phase: "incoherent", total: 0, courante: null, semaines: [], semainesAvecTravail: 0 };
  }

  const total = Math.ceil((end - start + 1) / 7);
  const minutes = new Array<number>(total).fill(0);
  for (const a of activities) {
    if (a.status !== "VALIDEE") continue;
    const d = dayNumber(isoDay(a.date));
    if (d === null || d < start || d > end) continue;
    minutes[Math.floor((d - start) / 7)] += a.durationMinutes;
  }

  // Le statut du stage prime sur les dates.
  const phase: PhaseStage =
    s.status === "ANNULE" ? "annule"
    : s.status === "TERMINE" ? "termine"
    : now < start ? "avant"
    : now > end ? "termine"
    : "en_cours";
  const courante = phase === "en_cours" ? Math.floor((now - start) / 7) + 1 : null;

  const semaines = minutes.map((m, i): SemaineFil => {
    const numero = i + 1;
    const debutSemaine = start + i * 7;
    let etat: SemaineFil["etat"];
    if (phase === "en_cours") etat = numero < courante! ? "passee" : numero === courante ? "courante" : "future";
    else if (phase === "termine") etat = "passee";
    else if (phase === "avant") etat = "future";
    else etat = debutSemaine <= now ? "passee" : "future"; // annulé : perles figées à la date du jour
    return { numero, minutes: m, intensite: intensite(m), etat };
  });

  return {
    phase,
    total,
    courante,
    semaines,
    semainesAvecTravail: minutes.filter((m) => m > 0).length,
  };
}

/** Libellé de chaque palier, pour que le fil se lise sans la taille ni la couleur. */
export const INTENSITE_LABELS: Record<Intensite, string> = {
  0: "aucun travail visé",
  1: "activité légère",
  2: "activité soutenue",
  3: "activité intense",
};

/** Libellé de l'encadré : « Semaine 3 / 12 », « Commence le … », « Terminé · 12 semaines »… jamais « Semaine 0 ». */
export function libelleEtapeFil(fil: FilDuStage, startDate: string): string {
  switch (fil.phase) {
    case "en_cours":
      return `Semaine ${fil.courante} / ${fil.total}`;
    case "avant":
      return `Commence le ${formatDay(isoDay(startDate))}`;
    case "termine":
      return `Terminé · ${fil.total} ${fil.total > 1 ? "semaines" : "semaine"}`;
    case "annule":
      return "Stage annulé";
    default:
      return "Période incohérente";
  }
}

/** Texte accessible d'une perle, ex. « Semaine 3 : activité soutenue, 12 h visées ». */
export function libelleSemaine(s: SemaineFil): string {
  if (s.etat === "future") return `Semaine ${s.numero} : à venir`;
  const enCours = s.etat === "courante" ? ", en cours" : "";
  const detail = s.minutes > 0 ? `${INTENSITE_LABELS[s.intensite]}, ${libelleDuree(s.minutes)} visées` : INTENSITE_LABELS[0];
  return `Semaine ${s.numero}${enCours} : ${detail}`;
}

// ---------- Libellés ----------

/** Jour en toutes lettres, sans décalage de fuseau, ex. « 1 juillet 2026 ». */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  if (!DAY_PATTERN.test(day)) return day;
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("fr-FR", { ...options, timeZone: "UTC" });
}

/** « 1 juillet → 31 décembre 2026 », ou les deux années si elles diffèrent. */
export function libellePeriode(startDate: string, endDate: string): string {
  const debut = isoDay(startDate);
  const fin = isoDay(endDate);
  const memeAnnee = debut.slice(0, 4) === fin.slice(0, 4);
  return `${formatDay(debut, memeAnnee ? { day: "numeric", month: "long" } : undefined)} → ${formatDay(fin)}`;
}

/** « Aujourd'hui », « Hier », sinon « mer. 1 oct. » (avec l'année si elle diffère). */
export function libelleJour(day: string, today: string): string {
  const d = dayNumber(day);
  const t = dayNumber(today);
  if (d === null || t === null) return day;
  if (d === t) return "Aujourd'hui";
  if (d === t - 1) return "Hier";
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return formatDay(day, { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/** « 45 min », « 3 h », « 1 h 30 ». */
export function libelleDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  DEVELOPPEMENT: "Développement",
  REUNION: "Réunion",
  FORMATION: "Formation",
  RECHERCHE: "Recherche",
  DOCUMENTATION: "Documentation",
  AUTRE: "Autre",
};

// ---------- Rapport à signer ----------

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  MENSUEL: "mensuel",
  FINAL: "final",
};

type SignatureFlag = "signedByTutor" | "signedByRH" | "signedByStagiaire";

/** Indicateur que l'API pose pour ce rôle (voir signReport côté serveur). */
export function signatureFlagOf(role: UserRole): SignatureFlag {
  if (role === "STAGIAIRE") return "signedByStagiaire";
  if (role === "TUTEUR") return "signedByTutor";
  return "signedByRH";
}

export type EtatSignature =
  | { kind: "a_signer"; report: Report }
  | { kind: "deja_signe" }
  | { kind: "aucun" };

/**
 * Rapport le plus récent au statut GENERE que ce rôle n'a pas encore signé.
 * « deja_signe » : des rapports attendent d'autres signatures, mais pas la sienne.
 */
export function etatSignature(reports: Report[], role: UserRole): EtatSignature {
  const flag = signatureFlagOf(role);
  const generes = reports.filter((r) => r.status === "GENERE");
  if (generes.length === 0) return { kind: "aucun" };
  const aSigner = generes
    .filter((r) => !r[flag])
    .sort((a, b) => (b.generatedAt ?? "").localeCompare(a.generatedAt ?? ""));
  return aSigner.length > 0 ? { kind: "a_signer", report: aSigner[0] } : { kind: "deja_signe" };
}
