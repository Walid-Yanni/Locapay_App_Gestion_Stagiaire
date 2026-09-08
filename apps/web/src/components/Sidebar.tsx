import { Bell, ClipboardCheck, FileText, Gauge, GraduationCap, UsersRound } from "lucide-react";
import type { UserRole } from "@locapay/shared-types";

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Gauge;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "stagiaires", label: "Stagiaires", icon: GraduationCap, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR"] },
  { id: "activities", label: "Activités", icon: ClipboardCheck, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "evaluations", label: "Évaluations", icon: UsersRound, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "reports", label: "Rapports", icon: FileText, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
  { id: "notifications", label: "Notifications", icon: Bell, roles: ["ADMIN_RH", "RESPONSABLE_RH", "TUTEUR", "STAGIAIRE"] },
];

export function Sidebar({
  role,
  view,
  onView,
  unreadCount = 0,
}: {
  role: UserRole;
  view: string;
  onView: (view: string) => void;
  unreadCount?: number;
}) {
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>LOCAPAY</strong>
        <span>Gestion Stagiaires</span>
      </div>
      <nav>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          const isNotification = item.id === "notifications";
          return (
            <button
              key={item.id}
              className={isActive ? "nav-item active" : "nav-item"}
              onClick={() => onView(item.id)}
            >
              <Icon size={18} />
              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
              {isNotification && unreadCount > 0 && (
                <span className="badge badge-orange" style={{ padding: "2px 6px", fontSize: "11px" }}>
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
