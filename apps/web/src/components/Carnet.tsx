// apps/web/src/components/Carnet.tsx
// « Carnet de stage » : fiche d'un stagiaire en double page (DESIGN.md §5).
// Les droits sont imposés par l'API : hors de sa portée, GET /api/stagiaires/:id répond 404.
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { libellePeriode, type StagiaireDetail } from "../lib/carnet";
import { initialsOf } from "../lib/registre";
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
}: {
  stagiaireId: string;
  onBack: () => void;
  backLabel: string;
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

      {etat.kind === "pret" && <CarnetPages stagiaire={etat.stagiaire} />}
    </div>
  );
}

function CarnetPages({ stagiaire: s }: { stagiaire: StagiaireDetail }) {
  const fullName = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || "Sans nom";
  const cursus = [s.school, s.level, s.fieldOfStudy].filter(Boolean).join(" · ");
  const tuteur = s.tutor ? `${s.tutor.firstName} ${s.tutor.lastName}` : "Non renseigné";
  const nbEntrees = s.activities.length;

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
      </section>

      <section className="carnet-page carnet-page--droite" aria-labelledby="carnet-journal-titre">
        <h2 id="carnet-journal-titre" className="carnet-titre-section">
          Journal d'activités
        </h2>
        <p className="carnet-muted">
          {nbEntrees === 0
            ? "Aucune entrée au journal pour l'instant."
            : `${nbEntrees} ${nbEntrees > 1 ? "entrées" : "entrée"} au journal.`}
        </p>
      </section>
    </div>
  );
}
