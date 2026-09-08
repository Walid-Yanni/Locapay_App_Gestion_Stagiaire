import { Bell, LogOut } from "lucide-react";
import type { UserRole } from "@locapay/shared-types";

export interface TopbarProps {
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onLogout: () => void;
}

export function Topbar({ user, unreadCount = 0, onNotificationsClick, onLogout }: TopbarProps) {
  const roleLabels: Record<UserRole, string> = {
    ADMIN_RH: "Administrateur RH",
    RESPONSABLE_RH: "Responsable RH",
    TUTEUR: "Tuteur de stage",
    STAGIAIRE: "Stagiaire",
  };

  return (
    <header className="topbar">
      <div>
        <p>{roleLabels[user.role] ?? user.role}</p>
        <h1>
          {user.firstName} {user.lastName}
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onNotificationsClick && (
          <button
            className="icon-button"
            style={{ position: "relative" }}
            aria-label="Notifications"
            title="Notifications"
            onClick={onNotificationsClick}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#9b2f2c",
                }}
              />
            )}
          </button>
        )}
        <button
          className="icon-button"
          aria-label="Déconnexion"
          title="Déconnexion"
          onClick={onLogout}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
