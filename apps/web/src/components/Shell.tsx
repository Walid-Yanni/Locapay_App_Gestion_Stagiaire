import { useEffect, useState } from "react";
import type React from "react";
import type { UserRole } from "@locapay/shared-types";
import { Sidebar } from "./Sidebar";

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
  // Tiroir de navigation sous 900 px : état purement visuel.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleView(next: string) {
    onView(next);
    setMenuOpen(false);
  }

  return (
    <div className={menuOpen ? "app-shell is-menu-open" : "app-shell"}>
      <header className="mobile-bar">
        <img src="/brand/locapay-logo-clair.png" alt="LOCAPAY" width={110} height={27} />
        <button
          type="button"
          className="mobile-bar__toggle"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Fermer" : "Menu"}
        </button>
      </header>
      {menuOpen && <div className="sidebar-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
      <Sidebar
        id="app-sidebar"
        user={user}
        view={view}
        onView={handleView}
        onLogout={onLogout}
        unreadCount={unreadCount}
      />
      <main className="main">{children}</main>
    </div>
  );
}
