// apps/web/src/components/Carnet.tsx
// « Carnet de stage » : fiche d'un stagiaire en double page (DESIGN.md §5).
// Les droits sont imposés par l'API : hors de sa portée, GET /api/stagiaires/:id répond 404.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Report, UserRole } from "@locapay/shared-types";
import { api, ApiError } from "../lib/api";
import {
  CATEGORY_LABELS,
  etatSignature,
  filDuStage,
  INTENSITE_LABELS,
  isoDay,
  libelleDuree,
  libelleEtapeFil,
  libelleJour,
  libellePeriode,
  libelleSemaine,
  REPORT_TYPE_LABELS,
  type Intensite,
  type SemaineFil,
  type StagiaireDetail,
} from "../lib/carnet";
import { todayLocal } from "../lib/dates";
import { activityVisa, initialsOf, type VisaKey } from "../lib/registre";
import { PageHeader } from "./PageHeader";
import "./Carnet.css";

type EtatCarnet =
  | { kind: "chargement" }
  | { kind: "introuvable" }
  | { kind: "erreur"; message: string }
  | { kind: "pret"; stagiaire: StagiaireDetail };

/** Charge la fiche ; le 404 est distingué des autres erreurs. Une réponse arrivée après un changement d'id est ignorée. */
function useCarnet(stagiaireId: string) {
  const [etat, setEtat] = useState<EtatCarnet>({ kind: "chargement" });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let actif = true;
    setEtat({ kind: "chargement" });
    api<StagiaireDetail>(`/api/stagiaires/${encodeURIComponent(stagiaireId)}`)
      .then((stagiaire) => {
        if (actif) setEtat({ kind: "pret", stagiaire });
      })
      .catch((err: unknown) => {
        if (!actif) return;
        if (err instanceof ApiError && err.status === 404) setEtat({ kind: "introuvable" });
        else if (err instanceof ApiError) setEtat({ kind: "erreur", message: err.message });
        else setEtat({ kind: "erreur", message: "Impossible de joindre le serveur. Vérifiez votre connexion." });
      });
    return () => {
      actif = false;
    };
  }, [stagiaireId, essai]);

  return { etat, recharger: () => setEssai((n) => n + 1) };
}

export function CarnetView({
  stagiaireId,
  onBack,
  backLabel,
  role,
  onSigned,
}: {
  stagiaireId: string;
  onBack: () => void;
  backLabel: string;
  role: UserRole;
  /** Appelé après une signature réussie, pour rafraîchir les listes de l'application. */
  onSigned: () => void;
}) {
  const { etat, recharger } = useCarnet(stagiaireId);
  const service = etat.kind === "pret" ? etat.stagiaire.service : "";

  return (
    <div className="carnet">
      <button type="button" className="carnet-back" onClick={onBack}>
        {backLabel}
      </button>
      <PageHeader eyebrow={service ? `Carnet · ${service}` : "Carnet"} title="Carnet de stage" />

      {etat.kind === "chargement" && (
        <p className="carnet-state" role="status">
          Chargement du carnet…
        </p>
      )}

      {etat.kind === "introuvable" && (
        <div className="carnet-state" role="alert">
          <p className="carnet-state__title">Carnet introuvable ou non accessible.</p>
          <button type="button" className="pill-button" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      )}

      {etat.kind === "erreur" && (
        <div className="carnet-state" role="alert">
          <p className="carnet-state__title">Le carnet n'a pas pu être chargé.</p>
          <p className="carnet-muted">{etat.message}</p>
          <button type="button" className="pill-button" onClick={recharger}>
            Réessayer
          </button>
        </div>
      )}

      {etat.kind === "pret" && (
        <CarnetPages stagiaire={etat.stagiaire} role={role} onSigned={() => { recharger(); onSigned(); }} />
      )}
    </div>
  );
}

function CarnetPages({ stagiaire: s, role, onSigned }: { stagiaire: StagiaireDetail; role: UserRole; onSigned: () => void }) {
  const fullName = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || "Sans nom";
  const cursus = [s.school, s.level, s.fieldOfStudy].filter(Boolean).join(" · ");
  const tuteur = s.tutor ? `${s.tutor.firstName} ${s.tutor.lastName}` : "Non renseigné";

  return (
    <div className="carnet-book">
      <section className="carnet-page carnet-page--gauche" aria-labelledby="carnet-nom">
        <header className="carnet-identite">
          <span className="carnet-avatar" aria-hidden="true">
            {initialsOf(s)}
          </span>
          <div className="carnet-identite__texte">
            <h2 id="carnet-nom" className="carnet-nom">
              {fullName}
            </h2>
            {cursus && <p className="carnet-cursus">{cursus}</p>}
          </div>
        </header>

        <dl className="carnet-fiche">
          <div className="carnet-champ">
            <dt>Période</dt>
            <dd>{libellePeriode(s.startDate, s.endDate)}</dd>
          </div>
          <div className="carnet-champ">
            <dt>Tuteur</dt>
            <dd>{tuteur}</dd>
          </div>
          <div className="carnet-champ">
            <dt>Objectif</dt>
            <dd>{s.subject}</dd>
          </div>
          <div className="carnet-champ">
            <dt>Service</dt>
            <dd>{s.service}</dd>
          </div>
        </dl>

        <FilDuStageEncadre stagiaire={s} />
        <Competences skills={s.skills} />
        <SignatureRapport reports={s.reports} role={role} onSigned={onSigned} />
      </section>

      <section className="carnet-page carnet-page--droite" aria-labelledby="carnet-journal-titre">
        <h2 id="carnet-journal-titre" className="carnet-titre-section">
          Journal d'activités
        </h2>
        <Journal activities={s.activities} />
      </section>
    </div>
  );
}

/** Classe d'une perle : la forme et la taille portent l'information, la couleur ne fait que la doubler. */
function classePerle(semaine: SemaineFil): string {
  if (semaine.etat === "future") return "carnet-perle is-future";
  const base = `carnet-perle is-i${semaine.intensite}`;
  return semaine.etat === "courante" ? `${base} is-courante` : base;
}

function FilDuStageEncadre({ stagiaire: s }: { stagiaire: StagiaireDetail }) {
  const fil = useMemo(() => filDuStage(s, s.activities, todayLocal()), [s]);
  const etape = libelleEtapeFil(fil, s.startDate);

  return (
    <section className="carnet-fil" aria-labelledby="carnet-fil-titre">
      <header className="carnet-fil__tete">
        <h3 id="carnet-fil-titre" className="carnet-sous-titre">
          Le fil du stage
        </h3>
        <span className="carnet-fil__etape">{etape}</span>
      </header>

      {fil.semaines.length > 0 && (
        <ol className="carnet-fil__perles">
          {fil.semaines.map((semaine) => {
            const libelle = libelleSemaine(semaine);
            return (
              <li key={semaine.numero} className={classePerle(semaine)} title={libelle}>
                <span className="carnet-sr">{libelle}</span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="carnet-fil__texte">
        {fil.phase === "incoherent"
          ? "La date de fin précède la date de début : le fil ne peut pas être tracé."
          : "Chaque perle est une semaine : sa taille raconte l'intensité du travail visé."}
        {fil.phase === "en_cours" && " La perle sombre marque la semaine en cours."}
        {fil.phase !== "incoherent" &&
          ` ${fil.semainesAvecTravail} ${fil.semainesAvecTravail > 1 ? "semaines" : "semaine"} avec du travail visé sur ${fil.total}.`}
      </p>

      {fil.semaines.length > 0 && (
        <ul className="carnet-fil__legende" aria-label="Légende des perles">
          {([0, 1, 2, 3] as Intensite[]).map((i) => (
            <li key={i}>
              <span className={`carnet-perle is-i${i}`} aria-hidden="true" />
              {i === 0 ? "aucun" : i === 1 ? "moins de 8 h" : i === 2 ? "8 à 20 h" : "20 h et plus"}
              <span className="carnet-sr"> : {INTENSITE_LABELS[i]}</span>
            </li>
          ))}
          <li>
            <span className="carnet-perle is-future" aria-hidden="true" />à venir
          </li>
        </ul>
      )}
    </section>
  );
}

function Competences({ skills }: { skills: StagiaireDetail["skills"] }) {
  return (
    <section className="carnet-competences" aria-labelledby="carnet-competences-titre">
      <h3 id="carnet-competences-titre" className="carnet-sous-titre">
        Compétences
      </h3>
      {skills.length === 0 ? (
        <p className="carnet-muted">Aucune compétence enregistrée.</p>
      ) : (
        <ul className="carnet-puces">
          {skills.map((k) => (
            <li key={k.id} className="carnet-puce">
              {k.skill?.name ?? "Compétence sans nom"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Nombre d'entrées affichées au départ, puis à chaque « Afficher les entrées plus anciennes ». */
const JOURNAL_PAQUET = 20;

/** Marqueurs de la frise (DESIGN.md §6) : la forme porte le statut, le libellé l'accompagne toujours. */
const LEGENDE: { key: VisaKey; label: string }[] = [
  { key: "vise", label: "Visé" },
  { key: "attente", label: "En attente" },
  { key: "revoir", label: "À revoir" },
  { key: "brouillon", label: "Brouillon" },
];

function Journal({ activities }: { activities: StagiaireDetail["activities"] }) {
  const [visibles, setVisibles] = useState(JOURNAL_PAQUET);
  const today = todayLocal();
  // Du plus récent au plus ancien ; à jour égal, la dernière saisie d'abord.
  const triees = useMemo(
    () =>
      [...activities].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [activities],
  );

  if (triees.length === 0) {
    return <p className="carnet-muted">Aucune entrée au journal pour l'instant.</p>;
  }

  const affichees = triees.slice(0, visibles);
  const restantes = triees.length - affichees.length;

  return (
    <>
      <ul className="carnet-legende" aria-label="Légende des marqueurs">
        {LEGENDE.map((item) => (
          <li key={item.key}>
            <span className={`carnet-marqueur carnet-marqueur--${item.key}`} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>

      <ol className="carnet-frise">
        {affichees.map((a, index) => {
          const visa = activityVisa(a.status);
          return (
            <li
              key={a.id}
              className={`carnet-entree carnet-entree--${visa.key}`}
              style={{ "--i": index % JOURNAL_PAQUET } as CSSProperties}
            >
              <span className={`carnet-marqueur carnet-marqueur--${visa.key}`} aria-hidden="true" />
              <div className="carnet-entree__corps">
                <p className="carnet-entree__meta">
                  <span className="carnet-entree__jour">{libelleJour(isoDay(a.date), today)}</span>
                  <span className={`carnet-cachet carnet-cachet--${visa.key}`}>{visa.label}</span>
                </p>
                <p className="carnet-entree__texte">{a.description}</p>
                <p className="carnet-entree__detail">
                  {CATEGORY_LABELS[a.category]} · {libelleDuree(a.durationMinutes)}
                </p>
                {a.status === "REJETEE" && a.tutorComment && (
                  <p className="carnet-entree__commentaire">
                    <span className="carnet-entree__commentaire-titre">Commentaire du tuteur : </span>
                    {a.tutorComment}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="carnet-journal__compte" role="status">
        {affichees.length} {affichees.length > 1 ? "entrées affichées" : "entrée affichée"} sur {triees.length}
      </p>
      {restantes > 0 && (
        <button
          type="button"
          className="carnet-journal__plus"
          onClick={() => setVisibles((n) => n + JOURNAL_PAQUET)}
        >
          Afficher les entrées plus anciennes
        </button>
      )}
    </>
  );
}

/**
 * Signature du rapport en attente pour le rôle connecté. Irréversible : aucune route ne retire une
 * signature. Un premier clic ne signe donc jamais ; il ouvre une confirmation explicite.
 */
function SignatureRapport({ reports, role, onSigned }: { reports: Report[]; role: UserRole; onSigned: () => void }) {
  const [confirmation, setConfirmation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const etat = etatSignature(reports, role);

  if (etat.kind === "aucun") return null;
  if (etat.kind === "deja_signe") {
    return (
      <section className="carnet-signature" aria-labelledby="carnet-signature-titre">
        <h3 id="carnet-signature-titre" className="carnet-sous-titre">Signature</h3>
        <p className="carnet-muted">Vous avez signé. Le rapport attend les autres signatures.</p>
      </section>
    );
  }

  const libelle = `rapport ${REPORT_TYPE_LABELS[etat.report.type]}`;

  async function signer() {
    if (etat.kind !== "a_signer") return;
    setEnvoi(true);
    setErreur(null);
    try {
      await api(`/api/reports/${encodeURIComponent(etat.report.id)}/sign`, { method: "PATCH" });
      setConfirmation(false);
      onSigned();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Impossible de joindre le serveur. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="carnet-signature" aria-labelledby="carnet-signature-titre">
      <h3 id="carnet-signature-titre" className="carnet-sous-titre">Signature</h3>
      {!confirmation ? (
        <>
          <p className="carnet-muted">Un {libelle} attend votre signature.</p>
          <button type="button" className="pill-button" onClick={() => setConfirmation(true)}>
            Signer le {libelle}
          </button>
        </>
      ) : (
        <div className="carnet-signature__confirm" role="alertdialog" aria-labelledby="carnet-signature-question">
          <p id="carnet-signature-question" className="carnet-signature__question">
            Signer le {libelle} ? Cette signature est définitive : elle ne pourra pas être retirée.
          </p>
          {erreur && <p className="carnet-signature__erreur" role="alert">{erreur}</p>}
          <div className="carnet-signature__actions">
            <button type="button" className="pill-button" onClick={signer} disabled={envoi} autoFocus>
              {envoi ? "Signature…" : "Confirmer la signature"}
            </button>
            <button type="button" className="carnet-signature__annuler" onClick={() => { setConfirmation(false); setErreur(null); }} disabled={envoi}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
