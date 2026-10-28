// Logique pure du Carnet de stage (apps/web/src/lib/carnet.ts) : hash, fil du stage, libellés, signature.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Report, Stagiaire } from "@locapay/shared-types";
import {
  etatSignature,
  filDuStage,
  intensite,
  libelleDuree,
  libelleEtapeFil,
  libelleJour,
  libellePeriode,
  libelleSemaine,
  parseCarnetHash,
} from "../apps/web/src/lib/carnet.js";

const ID = "cmv41ku050009w3pc7o2lo8sr";
type Periode = Pick<Stagiaire, "startDate" | "endDate" | "status">;
const stage = (debut: string, fin: string, status = "EN_COURS"): Periode =>
  ({ startDate: `${debut}T00:00:00.000Z`, endDate: `${fin}T00:00:00.000Z`, status }) as Periode;
const activite = (jour: string, minutes: number, status = "VALIDEE") =>
  ({ date: `${jour}T00:00:00.000Z`, durationMinutes: minutes, status }) as never;

test("parseCarnetHash : n'accepte que #carnet/<cuid>", () => {
  assert.deepEqual(parseCarnetHash(""), { kind: "aucun" });
  assert.deepEqual(parseCarnetHash("#autre"), { kind: "aucun" });
  assert.deepEqual(parseCarnetHash(`#carnet/${ID}`), { kind: "carnet", id: ID });
  for (const h of ["#carnet", "#carnet/", "#carnet/abc", `#carnet/${ID}x`, `#carnet/${ID.toUpperCase()}`,
    "#carnet/../api", `#carnet/${ID}/x`, `#carnet/x${ID.slice(1)}`]) {
    assert.deepEqual(parseCarnetHash(h), { kind: "invalide" }, h);
  }
});

test("intensite : bornes à 8 h et 20 h", () => {
  assert.deepEqual([0, 1, 479, 480, 1199, 1200].map(intensite), [0, 1, 1, 2, 2, 3]);
});

test("filDuStage : stage de 12 semaines, semaine courante et semaines futures", () => {
  const fil = filDuStage(stage("2026-07-01", "2026-09-22"), [], "2026-07-20");
  assert.equal(fil.total, 12);
  assert.equal(fil.phase, "en_cours");
  assert.equal(fil.courante, 3);
  assert.deepEqual(fil.semaines.map((w) => w.etat).slice(0, 4), ["passee", "passee", "courante", "future"]);
});

test("filDuStage : seules les activités VALIDEE de la période comptent", () => {
  const fil = filDuStage(
    stage("2026-07-01", "2026-07-14"),
    [
      activite("2026-07-01", 480), // semaine 1, comptée
      activite("2026-07-02", 60, "SOUMISE"), // ignorée
      activite("2026-07-03", 60, "REJETEE"), // ignorée
      activite("2026-07-04", 60, "BROUILLON"), // ignorée
      activite("2026-06-30", 600), // avant le début, ignorée
      activite("2026-07-15", 600), // après la fin, ignorée
      activite("2026-07-08", 1200), // semaine 2
    ],
    "2026-07-10",
  );
  assert.deepEqual(fil.semaines.map((w) => w.minutes), [480, 1200]);
  assert.deepEqual(fil.semaines.map((w) => w.intensite), [2, 3]);
  assert.equal(fil.semainesAvecTravail, 2);
});

test("filDuStage : le statut du stage prime sur les dates, période incohérente", () => {
  assert.equal(filDuStage(stage("2026-07-01", "2026-09-22", "TERMINE"), [], "2026-07-05").phase, "termine");
  assert.equal(filDuStage(stage("2026-07-01", "2026-09-22", "ANNULE"), [], "2026-07-05").phase, "annule");
  assert.equal(filDuStage(stage("2026-07-01", "2026-09-22"), [], "2026-06-01").phase, "avant");
  assert.equal(filDuStage(stage("2026-07-01", "2026-09-22"), [], "2026-12-01").phase, "termine");
  assert.equal(filDuStage(stage("2026-07-10", "2026-07-01"), [], "2026-07-05").phase, "incoherent");
});

test("libelleEtapeFil : jamais « Semaine 0 »", () => {
  const per = stage("2026-07-01", "2026-09-22");
  const r = [
    libelleEtapeFil(filDuStage(per, [], "2026-06-15"), per.startDate),
    libelleEtapeFil(filDuStage(per, [], "2026-07-01"), per.startDate),
    libelleEtapeFil(filDuStage(per, [], "2026-10-01"), per.startDate),
    libelleEtapeFil(filDuStage(stage("2026-07-01", "2026-09-22", "ANNULE"), [], "2026-08-01"), per.startDate),
  ];
  assert.deepEqual(r, ["Commence le 1 juillet 2026", "Semaine 1 / 12", "Terminé · 12 semaines", "Stage annulé"]);
});

test("libelleSemaine : texte accessible de chaque perle", () => {
  assert.equal(libelleSemaine({ numero: 3, minutes: 720, intensite: 2, etat: "passee" }), "Semaine 3 : activité soutenue, 12 h visées");
  assert.equal(libelleSemaine({ numero: 4, minutes: 0, intensite: 0, etat: "passee" }), "Semaine 4 : aucun travail visé");
  assert.equal(libelleSemaine({ numero: 16, minutes: 0, intensite: 0, etat: "courante" }), "Semaine 16, en cours : aucun travail visé");
  assert.equal(libelleSemaine({ numero: 17, minutes: 0, intensite: 0, etat: "future" }), "Semaine 17 : à venir");
});

test("libellés de durée, de jour et de période", () => {
  assert.deepEqual([45, 180, 90].map(libelleDuree), ["45 min", "3 h", "1 h 30"]);
  assert.equal(libelleJour("2026-10-15", "2026-10-15"), "Aujourd'hui");
  assert.equal(libelleJour("2026-10-14", "2026-10-15"), "Hier");
  assert.equal(libellePeriode("2026-07-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z"), "1 juillet → 31 décembre 2026");
  assert.equal(libellePeriode("2026-11-01T00:00:00.000Z", "2027-02-28T00:00:00.000Z"), "1 novembre 2026 → 28 février 2027");
});

test("etatSignature : le rapport GENERE le plus récent que ce rôle n'a pas signé", () => {
  const rapport = (o: Partial<Report>) =>
    ({ id: "r", status: "GENERE", type: "FINAL", generatedAt: "2026-10-01T00:00:00.000Z",
      signedByTutor: false, signedByRH: false, signedByStagiaire: false, ...o }) as unknown as Report;

  assert.deepEqual(etatSignature([], "TUTEUR"), { kind: "aucun" });
  assert.deepEqual(etatSignature([rapport({ status: "SIGNE" })], "TUTEUR"), { kind: "aucun" });

  const r = rapport({ id: "a", signedByTutor: true });
  assert.deepEqual(etatSignature([r], "TUTEUR"), { kind: "deja_signe" });
  assert.equal(etatSignature([r], "STAGIAIRE").kind, "a_signer");
  assert.equal(etatSignature([r], "ADMIN_RH").kind, "a_signer");
  assert.equal(etatSignature([rapport({ signedByRH: true })], "RESPONSABLE_RH").kind, "deja_signe");

  const ancien = rapport({ id: "vieux", generatedAt: "2026-09-01T00:00:00.000Z" });
  const recent = rapport({ id: "neuf", generatedAt: "2026-10-20T00:00:00.000Z" });
  const choisi = etatSignature([ancien, recent], "STAGIAIRE");
  assert.equal(choisi.kind === "a_signer" && choisi.report.id, "neuf");
});
