import React, { useState } from "react";
import { changePassword, type Session } from "../lib/api";
import "./ChangePasswordScreen.css";

const MIN_LENGTH = 12;

export function ChangePasswordScreen({
  user,
  onDone,
  onLogout,
}: {
  user: Session["user"];
  onDone: (user: Session["user"]) => void;
  onLogout: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    // Contrôles de confort : le serveur reste seul juge.
    if (newPassword.length < MIN_LENGTH) {
      setError(`Le nouveau mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (newPassword === currentPassword) {
      setError("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onDone(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le changement de mot de passe a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mdp">
      <section className="mdp__panel" aria-labelledby="mdp-title">
        <p className="mdp__eyebrow">LOCAPAY</p>
        <h1 id="mdp-title" className="mdp__title">Choisissez votre mot de passe</h1>
        <p className="mdp__intro">
          Bonjour {user.firstName}. Votre compte utilise encore un mot de passe temporaire.
          Remplacez-le pour accéder à l'application.
        </p>

        <form onSubmit={submit} className="mdp__form" noValidate>
          <label className="mdp__field">
            Mot de passe temporaire
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="mdp__field">
            Nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby="mdp-hint"
              required
            />
            <span id="mdp-hint" className="mdp__hint">
              {MIN_LENGTH} caractères minimum, différent du mot de passe temporaire.
            </span>
          </label>
          <label className="mdp__field">
            Confirmation
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="mdp__error" role="alert">
              {error}
            </p>
          )}

          <button className="mdp__submit" type="submit" disabled={submitting}>
            {submitting ? "Enregistrement..." : "Enregistrer le mot de passe"}
          </button>
        </form>

        <button type="button" className="mdp__logout" onClick={onLogout}>
          Se déconnecter
        </button>
      </section>
    </main>
  );
}
