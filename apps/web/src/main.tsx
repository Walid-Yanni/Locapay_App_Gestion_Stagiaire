import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity as ActivityIcon,
  BarChart3,
  Check,
  Download,
  FileSignature,
  GraduationCap,
  Plus,
  Send,
  X,
} from "lucide-react";
import type {
  Activity as ActivityType,
  Evaluation,
  Notification,
  Report,
  Stagiaire,
  UserRole,
} from "@locapay/shared-types";
import { Badge } from "./components/Badge";
import { CarnetView } from "./components/Carnet";
import { DataTable } from "./components/DataTable";
import { KpiCard } from "./components/KpiCard";
import { NouveauStagiaireModal } from "./components/NouveauStagiaireModal";
import { PageHeader, todayLabel } from "./components/PageHeader";
import { RegistreStats, RegistreTable } from "./components/Registre";
import { Shell } from "./components/Shell";
import { TemporaryPasswordDialog, type CreatedAccount } from "./components/TemporaryPasswordDialog";
import { useApiResource } from "./hooks/useApiResource";
import { api, downloadReportPdf, login, type Session } from "./lib/api";
import { carnetHash, parseCarnetHash } from "./lib/carnet";
import { registreStats } from "./lib/registre";
import { ChangePasswordScreen } from "./pages/ChangePasswordScreen";
import "./styles.css";

const demoAccounts: [string, string, UserRole][] = [
  ["admin.rh@locapay.bj", "Administrateur RH", "ADMIN_RH"],
  ["responsable.rh@locapay.bj", "Responsable RH", "RESPONSABLE_RH"],
  ["w.sacca@locapay.bj", "Tuteur (Walid)", "TUTEUR"],
  ["aicha.boni@stagiaire.locapay.bj", "Stagiaire (Aïcha)", "STAGIAIRE"],
];

function LoginScreen({ onSession }: { onSession: (session: Session) => void }) {
  const [email, setEmail] = useState(demoAccounts[0][0]);
  const [password, setPassword] = useState("Locapay2026!");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await login(email, password);
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identifiants invalides");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div>
          <p className="eyebrow">LOCAPAY</p>
          <h1>Gestion des stagiaires</h1>
          <p>Application unifiée RH, Tuteurs et Stagiaires.</p>
        </div>
        <form onSubmit={submit} className="form">
          <label>
            Adresse email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px", fontWeight: 700 }}>
          Comptes de démonstration rapide :
        </p>
        <div className="quick-grid">
          {demoAccounts.map(([account, label]) => (
            <button
              key={account}
              type="button"
              className={email === account ? "active" : ""}
              onClick={() => {
                setEmail(account);
                setPassword("Locapay2026!");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function DashboardView({
  stagiaires,
  activities,
  reports,
  user,
}: {
  stagiaires: Stagiaire[];
  activities: ActivityType[];
  reports: Report[];
  user: { firstName: string; lastName: string; role: UserRole };
}) {
  const activeCount = stagiaires.filter((s) => s.status === "EN_COURS").length;
  const pendingCount = activities.filter((a) => a.status === "SOUMISE").length;
  const validatedHours = Math.round(
    activities
      .filter((a) => a.status === "VALIDEE")
      .reduce((total, a) => total + a.durationMinutes, 0) / 60,
  );
  const signedCount = reports.filter((r) => r.status === "SIGNE").length;

  return (
    <section className="stack">
      <PageHeader eyebrow={`Vue d'ensemble · ${todayLabel()}`} title="Tableau de bord" />
      <div className="kpi-grid">
        <KpiCard
          title="Stages actifs"
          value={activeCount}
          icon={<GraduationCap size={22} />}
          hint={`${stagiaires.length} au total`}
        />
        <KpiCard
          title="Activités à valider"
          value={pendingCount}
          icon={<Send size={22} />}
          hint="En attente de revue tuteur"
        />
        <KpiCard
          title="Heures validées"
          value={`${validatedHours} h`}
          icon={<ActivityIcon size={22} />}
          hint="Cumul des activités approuvées"
        />
        <KpiCard
          title="Rapports signés"
          value={signedCount}
          icon={<FileSignature size={22} />}
          hint={`${reports.length} rapports générés`}
        />
      </div>

      <div className="table-card">
        <div className="section-head">
          <div>
            <h2>Vue d'ensemble</h2>
            <p>Derniers événements et progression des stages au sein de LOCAPAY.</p>
          </div>
          <BarChart3 size={24} color="var(--pine)" />
        </div>

        <h3 style={{ margin: "16px 0 8px", fontSize: "15px" }}>Dernières activités soumises</h3>
        <DataTable
          columns={[
            {
              header: "Date",
              accessor: (item) => new Date(item.date).toLocaleDateString("fr-FR"),
            },
            {
              header: "Catégorie",
              accessor: "category",
            },
            {
              header: "Description",
              accessor: "description",
            },
            {
              header: "Durée",
              accessor: (item) => `${Math.round(item.durationMinutes / 60)} h`,
            },
            {
              header: "Statut",
              render: (item) => <Badge value={item.status} />,
            },
          ]}
          data={activities.slice(0, 5)}
          keyExtractor={(item) => item.id}
          emptyMessage="Aucune activité récente"
        />
      </div>
    </section>
  );
}

function StagiairesView({
  stagiaires,
  activities,
  reports,
  reload,
  canCreate,
  onOpen,
}: {
  stagiaires: Stagiaire[];
  activities: ActivityType[];
  reports: Report[];
  reload: () => void;
  canCreate: boolean;
  onOpen: (stagiaire: Stagiaire) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const filtered = stagiaires.filter((s) => {
    const matchesSearch =
      `${s.user?.firstName} ${s.user?.lastName} ${s.school} ${s.subject}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleCreated(account: CreatedAccount) {
    setShowModal(false);
    reload();
    setCreatedAccount(account);
  }

  function closePasswordDialog() {
    // Le mot de passe quitte l'état React dès la fermeture.
    setCreatedAccount(null);
    newButtonRef.current?.focus();
  }

  return (
    <>
    <PageHeader
      eyebrow={`Journal de bord · ${todayLabel()}`}
      title="Registre des stagiaires"
      action={
        canCreate && (
          <button ref={newButtonRef} className="pill-button" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nouveau stagiaire
          </button>
        )
      }
    />
    <section className="table-card">

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Rechercher nom, école..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Tous les statuts</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINE">Terminé</option>
          <option value="ANNULE">Annulé</option>
        </select>
      </div>

      <div className="registre">
        <RegistreStats stats={registreStats(stagiaires, activities, reports)} />
        <RegistreTable stagiaires={filtered} activities={activities} onOpen={onOpen} />
      </div>

      {canCreate && showModal && (
        <NouveauStagiaireModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
      {createdAccount && (
        <TemporaryPasswordDialog account={createdAccount} onClose={closePasswordDialog} />
      )}
    </section>
    </>
  );
}

function ActivitiesView({
  activities,
  stagiaires,
  reload,
  role,
}: {
  activities: ActivityType[];
  stagiaires: Stagiaire[];
  reload: () => void;
  role: UserRole;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    stagiaireId: stagiaires[0]?.id ?? "",
    date: new Date().toISOString(),
    category: "DEVELOPPEMENT" as const,
    description: "",
    durationMinutes: 120,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes),
        }),
      });
      setShowModal(false);
      setForm({ ...form, description: "" });
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: "VALIDEE" | "REJETEE") {
    await api(`/api/activities/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        tutorComment: status === "VALIDEE" ? "Activité approuvée." : "À revoir.",
      }),
    });
    reload();
  }

  const canReview = role === "TUTEUR" || role === "ADMIN_RH" || role === "RESPONSABLE_RH";

  return (
    <>
    <PageHeader
      eyebrow={todayLabel()}
      title="Suivi du jour"
      action={
        <button className="pill-button" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nouvelle activité
        </button>
      }
    />
    <section className="table-card">

      <DataTable
        columns={[
          {
            header: "Date",
            accessor: (item) => new Date(item.date).toLocaleDateString("fr-FR"),
          },
          {
            header: "Catégorie",
            accessor: "category",
          },
          {
            header: "Description",
            accessor: "description",
          },
          {
            header: "Durée",
            accessor: (item) => `${Math.round(item.durationMinutes / 60)} h (${item.durationMinutes} min)`,
          },
          {
            header: "Statut",
            render: (item) => <Badge value={item.status} />,
          },
          {
            header: "Actions",
            render: (item) => {
              if (!canReview || item.status !== "SOUMISE") return null;
              return (
                <div className="actions-cell">
                  <button
                    className="icon-button btn-success"
                    title="Valider l'activité"
                    onClick={() => handleReview(item.id, "VALIDEE")}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="icon-button btn-danger"
                    title="Rejeter"
                    onClick={() => handleReview(item.id, "REJETEE")}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            },
          },
        ]}
        data={activities}
        keyExtractor={(item) => item.id}
      />

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajouter une activité</h2>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="form">
              <label>
                Stagiaire
                <select
                  value={form.stagiaireId}
                  onChange={(e) => setForm({ ...form, stagiaireId: e.target.value })}
                >
                  {stagiaires.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.firstName} {s.user?.lastName} ({s.subject})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Catégorie
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as typeof form.category })
                    }
                  >
                    <option value="DEVELOPPEMENT">Développement</option>
                    <option value="REUNION">Réunion</option>
                    <option value="FORMATION">Formation</option>
                    <option value="RECHERCHE">Recherche</option>
                    <option value="DOCUMENTATION">Documentation</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </label>
                <label>
                  Durée (minutes)
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label>
                Description du travail réalisé
                <textarea
                  required
                  placeholder="Décrivez les tâches accomplies, livrables ou réunions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Soumettre l'activité"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
    </>
  );
}

function EvaluationsView({
  evaluations,
  stagiaires,
  reload,
  canEvaluate,
}: {
  evaluations: Evaluation[];
  stagiaires: Stagiaire[];
  reload: () => void;
  canEvaluate: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    stagiaireId: stagiaires[0]?.id ?? "",
    technicalScore: 4,
    communicationScore: 4,
    autonomyScore: 4,
    punctualityScore: 5,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/api/evaluations", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({ ...form, comment: "" });
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <PageHeader
      eyebrow="Entretiens de suivi"
      title="Évaluations"
      action={
        canEvaluate && (
          <button className="pill-button" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nouvelle évaluation
          </button>
        )
      }
    />
    <section className="table-card">

      <DataTable
        columns={[
          {
            header: "Date",
            accessor: (item) => new Date(item.createdAt).toLocaleDateString("fr-FR"),
          },
          {
            header: "Notes détaillées",
            render: (item) => (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span className="badge badge-blue">Technique: {item.technicalScore}/5</span>
                <span className="badge badge-green">Comm: {item.communicationScore}/5</span>
                <span className="badge badge-orange">Autonomie: {item.autonomyScore}/5</span>
                <span className="badge badge-blue">Ponctualité: {item.punctualityScore}/5</span>
              </div>
            ),
          },
          {
            header: "Moyenne",
            render: (item) => {
              const avg = (
                (item.technicalScore +
                  item.communicationScore +
                  item.autonomyScore +
                  item.punctualityScore) /
                4
              ).toFixed(1);
              return <strong>{avg} / 5</strong>;
            },
          },
          {
            header: "Appréciation",
            accessor: "comment",
          },
        ]}
        data={evaluations}
        keyExtractor={(item) => item.id}
      />

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle évaluation de stage</h2>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="form">
              <label>
                Stagiaire à évaluer
                <select
                  value={form.stagiaireId}
                  onChange={(e) => setForm({ ...form, stagiaireId: e.target.value })}
                >
                  {stagiaires.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.firstName} {s.user?.lastName} — {s.service}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Compétences techniques ({form.technicalScore}/5)
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.technicalScore}
                    onChange={(e) => setForm({ ...form, technicalScore: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Communication & équipe ({form.communicationScore}/5)
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.communicationScore}
                    onChange={(e) => setForm({ ...form, communicationScore: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Autonomie & initiative ({form.autonomyScore}/5)
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.autonomyScore}
                    onChange={(e) => setForm({ ...form, autonomyScore: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Ponctualité & assiduité ({form.punctualityScore}/5)
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.punctualityScore}
                    onChange={(e) => setForm({ ...form, punctualityScore: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label>
                Appréciation générale
                <textarea
                  required
                  placeholder="Remarques sur les progrès, livrables et recommandations..."
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                />
              </label>
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Valider l'évaluation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
    </>
  );
}

function ReportsView({
  reports,
  stagiaires,
  reload,
  role,
}: {
  reports: Report[];
  stagiaires: Stagiaire[];
  reload: () => void;
  role: UserRole;
}) {
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleGenerateFinal(stagiaireId: string) {
    setGenerating(true);
    try {
      await api(`/api/reports/final/${stagiaireId}`, { method: "POST" });
      reload();
    } finally {
      setGenerating(false);
    }
  }

  async function handleSign(reportId: string) {
    await api(`/api/reports/${reportId}/sign`, { method: "PATCH" });
    reload();
  }

  async function handleDownload(reportId: string, title: string) {
    setDownloading(reportId);
    try {
      await downloadReportPdf(reportId, `${title.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
    <PageHeader
      eyebrow="Fin de stage"
      title="Rapports et certificats"
      action={
        stagiaires.length > 0 && (
          <button
            className="pill-button"
            disabled={generating}
            onClick={() => handleGenerateFinal(stagiaires[0].id)}
          >
            <Plus size={16} /> Générer rapport ({stagiaires[0]?.user?.firstName})
          </button>
        )
      }
    />
    <section className="table-card">

      <DataTable
        columns={[
          {
            header: "Titre du rapport",
            render: (item) => (
              <div>
                <strong>{item.title}</strong>
                <small>Type: {item.type}</small>
              </div>
            ),
          },
          {
            header: "Généré le",
            render: (item) =>
              item.generatedAt ? new Date(item.generatedAt).toLocaleDateString("fr-FR") : "—",
          },
          {
            header: "Statut",
            render: (item) => (
              <div className="stack" style={{ gap: "4px" }}>
                <Badge value={item.status} />
                <small>Tuteur: {item.signedByTutor ? "Signé" : "En attente"}</small>
                <small>RH: {item.signedByRH ? "Signé" : "En attente"}</small>
                <small>Stagiaire: {item.signedByStagiaire ? "Signé" : "En attente"}</small>
              </div>
            ),
          },
          {
            header: "Actions",
            render: (item) => (
              <div className="actions-cell">
                {item.status !== "SIGNE" && !(
                  (role === "TUTEUR" && item.signedByTutor) ||
                  (role === "STAGIAIRE" && item.signedByStagiaire) ||
                  ((role === "ADMIN_RH" || role === "RESPONSABLE_RH") && item.signedByRH)
                ) && (
                  <button
                    className="btn-sm secondary-button"
                    title="Signer électroniquement"
                    onClick={() => handleSign(item.id)}
                  >
                    <FileSignature size={14} /> Signer
                  </button>
                )}
                <button
                  className="btn-sm primary-button"
                  title="Télécharger le document PDF"
                  disabled={downloading === item.id}
                  onClick={() => handleDownload(item.id, item.title)}
                >
                  <Download size={14} />{" "}
                  {downloading === item.id ? "Téléchargement..." : "PDF"}
                </button>
              </div>
            ),
          },
        ]}
        data={reports}
        keyExtractor={(item) => item.id}
      />
    </section>
    </>
  );
}

function NotificationsView({
  notifications,
  reload,
}: {
  notifications: Notification[];
  reload: () => void;
}) {
  async function markRead(id: string) {
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    reload();
  }

  return (
    <>
    <PageHeader eyebrow="Messages" title="Notifications" />
    <section className="table-card">

      <div className="stack">
        {notifications.length === 0 ? (
          <div className="empty-state">Aucune notification</div>
        ) : (
          notifications.map((n) => (
            <article
              key={n.id}
              className="row-card"
              style={{
                background: n.readAt ? "transparent" : "var(--mint)",
                padding: "14px",
                borderRadius: "8px",
              }}
            >
              <span>
                <strong>{n.title}</strong>
                <small>{n.message}</small>
                <small style={{ opacity: 0.7 }}>
                  {new Date(n.createdAt).toLocaleString("fr-FR")}
                </small>
              </span>
              {!n.readAt && (
                <button className="btn-sm secondary-button" onClick={() => markRead(n.id)}>
                  Marquer comme lu
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
    </>
  );
}

/** Retire le hash de l'URL sans recharger. « push » garde une entrée d'historique (retour possible vers le carnet). */
function clearHash(mode: "push" | "replace") {
  const url = window.location.pathname + window.location.search;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

function App() {
  const storedUser = localStorage.getItem("user");
  const storedToken = localStorage.getItem("accessToken");
  const [session, setSession] = useState<Session | null>(
    storedUser && storedToken
      ? {
          accessToken: storedToken,
          refreshToken: "",
          user: JSON.parse(storedUser),
        }
      : null,
  );
  function handleLogout() {
    localStorage.clear();
    // Un carnet ouvert ne doit pas être rouvert à la connexion suivante.
    clearHash("replace");
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onSession={setSession} />;
  }

  if (session.user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        user={session.user}
        onDone={(user) => setSession({ ...session, user })}
        onLogout={handleLogout}
      />
    );
  }

  // Monté seulement avec une session valide : les données se chargent à la connexion
  // (ou à la fin du changement de mot de passe) et sont détruites à la déconnexion.
  return <Workspace key={session.user.id} session={session} onLogout={handleLogout} />;
}

function Workspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const role = session.user.role as UserRole;
  // Vue d'accueil d'un carnet fermé : le Registre, sauf pour le stagiaire qui n'y a pas accès.
  const homeView = role === "STAGIAIRE" ? "dashboard" : "stagiaires";

  // Le hash n'est lu qu'ici : Workspace n'est monté qu'une fois la session établie.
  const [initialHash] = useState(() => parseCarnetHash(window.location.hash));
  const [carnetId, setCarnetId] = useState<string | null>(
    initialHash.kind === "carnet" ? initialHash.id : null,
  );
  const [view, setView] = useState(
    initialHash.kind === "carnet" ? "carnet" : initialHash.kind === "invalide" ? homeView : "dashboard",
  );

  useEffect(() => {
    if (initialHash.kind === "invalide") clearHash("replace");
  }, [initialHash]);

  // Boutons « retour » / « suivant » du navigateur, ou hash modifié à la main.
  useEffect(() => {
    function onPopState() {
      const hash = parseCarnetHash(window.location.hash);
      if (hash.kind === "carnet") {
        setCarnetId(hash.id);
        setView("carnet");
        return;
      }
      if (hash.kind === "invalide") clearHash("replace");
      setCarnetId(null);
      setView((current) => (current === "carnet" || hash.kind === "invalide" ? homeView : current));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [homeView]);

  function openCarnet(stagiaire: Stagiaire) {
    window.history.pushState(null, "", carnetHash(stagiaire.id));
    setCarnetId(stagiaire.id);
    setView("carnet");
  }

  function navigate(next: string) {
    if (view === "carnet") clearHash("push");
    setCarnetId(null);
    setView(next);
  }

  const stagiaires = useApiResource<Stagiaire[]>("/api/stagiaires", []);
  const activities = useApiResource<ActivityType[]>("/api/activities", []);
  const evaluations = useApiResource<Evaluation[]>("/api/evaluations", []);
  const reports = useApiResource<Report[]>("/api/reports", []);
  const notifications = useApiResource<Notification[]>("/api/notifications", []);

  const unreadNotificationsCount = useMemo(
    () => notifications.data.filter((n) => !n.readAt).length,
    [notifications.data],
  );

  const loading =
    stagiaires.loading &&
    activities.loading &&
    evaluations.loading &&
    reports.loading &&
    notifications.loading;

  const canManageStagiaires = role === "ADMIN_RH" || role === "RESPONSABLE_RH";
  const canEvaluate = role === "TUTEUR" || role === "ADMIN_RH" || role === "RESPONSABLE_RH";

  return (
    <Shell
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role,
      }}
      view={view === "carnet" ? homeView : view}
      onView={navigate}
      onLogout={onLogout}
      unreadCount={unreadNotificationsCount}
    >
      {loading ? (
        <div className="empty-state">Chargement des données...</div>
      ) : (
        <>
          {view === "dashboard" && (
            <DashboardView
              stagiaires={stagiaires.data}
              activities={activities.data}
              reports={reports.data}
              user={{ ...session.user, role }}
            />
          )}
          {view === "stagiaires" && (
            <StagiairesView
              stagiaires={stagiaires.data}
              activities={activities.data}
              reports={reports.data}
              reload={stagiaires.reload}
              canCreate={canManageStagiaires}
              onOpen={openCarnet}
            />
          )}
          {view === "carnet" && carnetId && (
            <CarnetView
              key={carnetId}
              stagiaireId={carnetId}
              onBack={() => navigate(homeView)}
              backLabel={homeView === "stagiaires" ? "Retour au registre" : "Retour au tableau de bord"}
            />
          )}
          {view === "activities" && (
            <ActivitiesView
              activities={activities.data}
              stagiaires={stagiaires.data}
              reload={activities.reload}
              role={role}
            />
          )}
          {view === "evaluations" && (
            <EvaluationsView
              evaluations={evaluations.data}
              stagiaires={stagiaires.data}
              reload={evaluations.reload}
              canEvaluate={canEvaluate}
            />
          )}
          {view === "reports" && (
            <ReportsView
              reports={reports.data}
              stagiaires={stagiaires.data}
              reload={reports.reload}
              role={role}
            />
          )}
          {view === "notifications" && (
            <NotificationsView
              notifications={notifications.data}
              reload={notifications.reload}
            />
          )}
        </>
      )}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
