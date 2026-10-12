import type { UserRole } from "@locapay/shared-types";

// Marqueurs géométriques provisoires (DESIGN.md §4) : dessinés en CSS, pas de bibliothèque d'icônes.
export type NavMarker = "square" | "diamond" | "dash" | "circle" | "square-outline" | "dot";

export interface NavItem {
  id: string;
  label: string;
  marker: NavMarker;
  roles: UserRole[];
}

// Les id correspondent aux vues existantes de main.tsx ; seuls les libellés suivent la maquette.
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", marker: "square", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "stagiaires", label: "Registre", marker: "diamond", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR"] },
  { id: "activities", label: "Suivi du jour", marker: "dash", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "evaluations", label: "Évaluations", marker: "circle", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "reports", label: "Rapports", marker: "square-outline", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "notifications", label: "Notifications", marker: "dot", roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN_RH: "Administrateur RH",
  RESPONSABLE_RH: "Responsable RH",
  TUTEUR: "Tuteur de stage",
  STAGIAIRE: "Stagiaire",
};

export function Sidebar({
  id,
  user,
  view,
  onView,
  onLogout,
  unreadCount = 0,
}: {
  id?: string;
  user: { firstName: string; lastName: string; role: UserRole };
  view: string;
  onView: (view: string) => void;
  onLogout: () => void;
  unreadCount?: number;
}) {
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <aside className="sidebar" id={id}>
      <img
        className="sidebar-logo"
        src="/brand/locapay-logo-clair.png"
        alt="LOCAPAY"
        width={130}
        height={32}
      />
      <p className="sidebar-label">Carnet RH</p>
      <nav aria-label="Navigation principale">
        {visibleNav.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? "nav-item active" : "nav-item"}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onView(item.id)}
            >
              <span className={`nav-marker nav-marker--${item.marker}`} aria-hidden="true" />
              <span className="nav-item__label">{item.label}</span>
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="nav-item__count" aria-label={`${unreadCount} non lues`}>
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-user">
        <span className="sidebar-user__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="sidebar-user__id">
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <span className="sidebar-user__role">{ROLE_LABELS[user.role] ?? user.role}</span>
        </span>
        <button type="button" className="sidebar-user__logout" onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
