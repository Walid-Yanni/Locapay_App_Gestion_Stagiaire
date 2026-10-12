import type React from "react";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  /** Bouton d'action, déjà conditionné par la vue (ex. selon le rôle). */
  action?: React.ReactNode;
}

// En-tête commun des vues : petit libellé vert, titre, bouton pilule à droite (DESIGN.md §4).
export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">{eyebrow}</p>
        <h1 className="page-header__title">{title}</h1>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}

/** Date du jour en toutes lettres, ex. « samedi 4 octobre 2026 ». */
export function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
