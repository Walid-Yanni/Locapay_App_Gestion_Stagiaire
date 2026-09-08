import type React from "react";
import type { UserRole } from "@locapay/shared-types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface ShellProps {
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  view: string;
  onView: (view: string) => void;
  onLogout: () => void;
  unreadCount?: number;
  children: React.ReactNode;
}

export function Shell({
  user,
  view,
  onView,
  onLogout,
  unreadCount = 0,
  children,
}: ShellProps) {
  return (
    <div className="app-shell">
      <Sidebar
        role={user.role}
        view={view}
        onView={onView}
        unreadCount={unreadCount}
      />
      <main className="main">
        <Topbar
          user={user}
          unreadCount={unreadCount}
          onNotificationsClick={() => onView("notifications")}
          onLogout={onLogout}
        />
        {children}
      </main>
    </div>
  );
}
