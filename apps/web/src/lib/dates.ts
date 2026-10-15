// apps/web/src/lib/dates.ts
// Dates de calendrier au format AAAA-MM-JJ, manipulées sans fuseau horaire
// (aucun passage par new Date(chaîne locale), source classique de décalage d'un jour).

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Date du jour selon l'horloge locale, au format AAAA-MM-JJ. */
export function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Ajoute des mois en ramenant le jour au dernier jour du mois cible si besoin :
 * 31 mai + 3 mois = 31 août ; 30 nov. + 3 mois = 28 ou 29 février.
 */
export function addMonthsClamped(day: string, months: number): string {
  const match = DAY_PATTERN.exec(day);
  if (!match) return day;
  const [, y, m, d] = match;
  const monthIndex = Number(m) - 1 + months;
  const year = Number(y) + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  // Jour 0 du mois suivant = dernier jour du mois cible (calcul en UTC, sans fuseau).
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(Number(d), lastDay))}`;
}

/** Convertit AAAA-MM-JJ en ISO minuit UTC, attendu par l'API ("AAAA-MM-JJT00:00:00.000Z"). */
export function dayToIsoUtc(day: string): string {
  return DAY_PATTERN.test(day) ? `${day}T00:00:00.000Z` : day;
}
