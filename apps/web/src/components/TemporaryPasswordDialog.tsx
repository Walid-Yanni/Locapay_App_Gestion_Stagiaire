// apps/web/src/components/TemporaryPasswordDialog.tsx
// Affiche une seule fois le mot de passe temporaire d'un compte créé.
// Le mot de passe ne quitte jamais l'état React du parent (ni stockage, ni URL, ni console).
// Fermeture : uniquement par le bouton, ou Échap après une copie réussie ; le fond ne ferme pas.
import { useEffect, useRef, useState } from "react";
import "./TemporaryPasswordDialog.css";

export interface CreatedAccount {
  fullName: string;
  email: string;
  temporaryPassword: string;
}

type CopyState = "idle" | "copied" | "failed";

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function TemporaryPasswordDialog({
  account,
  onClose,
}: {
  account: CreatedAccount;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLElement>(null);

  useEffect(() => {
    copyButtonRef.current?.focus();
  }, []);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Presse-papiers indisponible");
      await navigator.clipboard.writeText(account.temporaryPassword);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      selectPassword();
    }
  }

  // Sélectionne le mot de passe pour une copie manuelle (Ctrl+C / Cmd+C).
  function selectPassword() {
    const node = passwordRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Écouteur sur le document : reste actif même si un clic sur le fond a retiré le focus.
  const copiedRef = useRef(false);
  copiedRef.current = copyState === "copied";
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (copiedRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Piège à focus : Tab et Maj+Tab restent dans le dialogue.
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const outside = !dialog.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="mdp-temp">
      <div
        ref={dialogRef}
        className="mdp-temp__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="mdp-temp-title"
        aria-describedby="mdp-temp-desc"
      >
        <p className="mdp-temp__eyebrow">Compte créé</p>
        <h2 id="mdp-temp-title" className="mdp-temp__title">
          Mot de passe temporaire
        </h2>
        <dl className="mdp-temp__account">
          <div>
            <dt>Stagiaire</dt>
            <dd>{account.fullName}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{account.email}</dd>
          </div>
        </dl>

        <div className="mdp-temp__secret">
          <code ref={passwordRef} className="mdp-temp__password" aria-label="Mot de passe temporaire">
            {account.temporaryPassword}
          </code>
          <button
            ref={copyButtonRef}
            type="button"
            className="mdp-temp__copy"
            onClick={copy}
            data-state={copyState}
          >
            {copyState === "copied" ? "Copié" : "Copier"}
          </button>
        </div>
        <p className="mdp-temp__status" role="status" aria-live="polite">
          {copyState === "copied" && "Mot de passe copié dans le presse-papiers."}
          {copyState === "failed" &&
            "La copie automatique n'est pas disponible. Le mot de passe est sélectionné : copiez-le avec Ctrl+C (Cmd+C sur Mac)."}
        </p>

        <p id="mdp-temp-desc" className="mdp-temp__warning">
          Transmettez ce mot de passe au stagiaire maintenant : il ne sera plus jamais affiché. Le
          stagiaire devra le changer à sa première connexion.
        </p>

        <button type="button" className="mdp-temp__done" onClick={onClose}>
          J'ai transmis le mot de passe
        </button>
      </div>
    </div>
  );
}
