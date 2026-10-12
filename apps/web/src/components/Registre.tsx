// apps/web/src/components/Registre.tsx
import { useMemo, type CSSProperties } from "react";
import type { Activity, Stagiaire } from "@locapay/shared-types";
import {
  BEADS,
  filledBeads,
  initialsOf,
  lastActivityByStagiaire,
  relativeLabel,
  stageProgress,
  visaOf,
  type RegistreStatsData,
} from "../lib/registre";
import "./Registre.css";

/** Bandeau de quatre chiffres au-dessus du registre. */
export function RegistreStats({ stats }: { stats: RegistreStatsData }) {
  const items: { value: number; label: string; accent?: boolean }[] = [
    { value: stats.enPoste, label: "stagiaires en poste", accent: true },
    { value: stats.entreesSemaine, label: "entrées cette semaine" },
    { value: stats.visasEnAttente, label: "visas en attente" },
    { value: stats.rapportsASigner, label: "rapports à signer" },
  ];
  return (
    <ul className="registre-stats">
      {items.map((item) => (
        <li className="registre-stat" key={item.label}>
          <strong className={item.accent ? "registre-stat-value is-accent" : "registre-stat-value"}>
            {String(item.value).padStart(2, "0")}
          </strong>
          <span className="registre-stat-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

interface RegistreTableProps {
  stagiaires: Stagiaire[];
  activities: Activity[];
  /** Optionnel : si fourni, le nom devient un bouton accessible et la ligne est cliquable. */
  onOpen?: (stagiaire: Stagiaire) => void;
}

/** Le registre : une ligne par stagiaire, numérotée, avec parcours en perles et visa en cachet. */
export function RegistreTable({ stagiaires, activities, onOpen }: RegistreTableProps) {
  const lastByStagiaire = useMemo(() => lastActivityByStagiaire(activities), [activities]);
  const now = useMemo(() => new Date(), []);

  if (stagiaires.length === 0) {
    return <div className="empty-state">Aucun stagiaire ne correspond à cette recherche.</div>;
  }

  return (
    <div className="registre-scroll">
      <table className="registre-table">
        <thead>
          <tr>
            <th scope="col" className="col-num">N°</th>
            <th scope="col">Stagiaire</th>
            <th scope="col">Pôle</th>
            <th scope="col">Parcours</th>
            <th scope="col">Dernière entrée</th>
            <th scope="col">Visa</th>
          </tr>
        </thead>
        <tbody>
          {stagiaires.map((s, index) => {
            const last = lastByStagiaire.get(s.id);
            const progress = stageProgress(s, now);
            const filled = filledBeads(progress);
            const visa = visaOf(s, last);
            const fullName = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || "Sans nom";

            return (
              <tr
                key={s.id}
                className={onOpen ? "registre-row is-clickable" : "registre-row"}
                style={{ "--i": index } as CSSProperties}
                onClick={onOpen ? () => onOpen(s) : undefined}
              >
                <td className="col-num" data-label="N°">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td data-label="Stagiaire">
                  <div className="registre-person">
                    <span className="registre-avatar" aria-hidden="true">{initialsOf(s)}</span>
                    {onOpen ? (
                      <button
                        type="button"
                        className="registre-name registre-name-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(s);
                        }}
                      >
                        {fullName}
                      </button>
                    ) : (
                      <span className="registre-name">{fullName}</span>
                    )}
                  </div>
                </td>
                <td data-label="Pôle">{s.service}</td>
                <td data-label="Parcours">
                  <span
                    className="registre-beads"
                    role="img"
                    aria-label={`Parcours : ${Math.round(progress * 100)} % du stage écoulé`}
                  >
                    {Array.from({ length: BEADS }, (_, i) => (
                      <span
                        key={i}
                        className={
                          i < filled ? (i === filled - 1 && progress < 1 ? "bead is-current" : "bead is-filled") : "bead"
                        }
                      />
                    ))}
                  </span>
                </td>
                <td data-label="Dernière entrée">
                  {last ? (
                    <div className="registre-last">
                      <span className="registre-last-title">{last.description}</span>
                      <span className="registre-last-when">{relativeLabel(last, now)}</span>
                    </div>
                  ) : (
                    <span className="registre-muted">—</span>
                  )}
                </td>
                <td data-label="Visa">
                  <span className={`visa visa--${visa.key}`}>{visa.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
