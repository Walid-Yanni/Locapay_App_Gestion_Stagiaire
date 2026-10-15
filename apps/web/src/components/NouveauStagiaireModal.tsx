// apps/web/src/components/NouveauStagiaireModal.tsx
// Fenêtre de création d'un stagiaire. Montée seulement à l'ouverture : formulaire et erreurs
// repartent donc de zéro à chaque ouverture ou fermeture.
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { addMonthsClamped, dayToIsoUtc, todayLocal } from "../lib/dates";
import "./NouveauStagiaireModal.css";

interface Tutor {
  id: string;
  firstName: string;
  lastName: string;
}

type TypeStage = "PROFESSIONNEL" | "OBLIGATOIRE" | "INITIATION";

const LEVELS = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];

const STAGE_TYPES: { value: TypeStage; label: string }[] = [
  { value: "PROFESSIONNEL", label: "Stage professionnel" },
  { value: "OBLIGATOIRE", label: "Stage obligatoire (cursus)" },
  { value: "INITIATION", label: "Stage d'initiation" },
];

const STAGE_MONTHS = 3;

type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "school"
  | "fieldOfStudy"
  | "level"
  | "tutorId"
  | "startDate"
  | "endDate"
  | "typeStage"
  | "subject"
  | "service";

// Les messages de validation Zod de l'API sont en anglais : on affiche un libellé français par champ.
const FIELD_MESSAGES: Record<Field, string> = {
  firstName: "Le prénom doit contenir au moins 2 caractères.",
  lastName: "Le nom doit contenir au moins 2 caractères.",
  email: "Adresse e-mail invalide.",
  school: "L'école doit contenir au moins 2 caractères.",
  fieldOfStudy: "La filière doit contenir au moins 2 caractères.",
  level: "Choisissez un niveau d'études.",
  tutorId: "Choisissez un tuteur.",
  startDate: "Date de début invalide.",
  endDate: "La date de fin doit être postérieure à la date de début.",
  typeStage: "Choisissez un type de stage.",
  subject: "Le sujet doit contenir au moins 3 caractères.",
  service: "Le service doit contenir au moins 2 caractères.",
};

function isField(value: unknown): value is Field {
  return typeof value === "string" && value in FIELD_MESSAGES;
}

function initialForm() {
  const startDate = todayLocal();
  return {
    firstName: "",
    lastName: "",
    email: "",
    school: "",
    fieldOfStudy: "",
    level: "Licence 3",
    tutorId: "",
    startDate,
    endDate: addMonthsClamped(startDate, STAGE_MONTHS),
    typeStage: "PROFESSIONNEL" as TypeStage,
    subject: "",
    service: "Ingénierie logicielle",
  };
}

export function NouveauStagiaireModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (temporaryPassword: string) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [endEdited, setEndEdited] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutorsState, setTutorsState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Tutor[]>("/api/users/tutors")
      .then((list) => {
        if (cancelled) return;
        setTutors(list);
        setTutorsState("ready");
      })
      .catch(() => {
        if (!cancelled) setTutorsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends Field>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeStartDate(startDate: string) {
    setForm((current) => ({
      ...current,
      startDate,
      // La fin suit le début tant qu'elle n'a pas été modifiée à la main.
      endDate: endEdited || !startDate ? current.endDate : addMonthsClamped(startDate, STAGE_MONTHS),
    }));
    setFieldErrors((current) => ({ ...current, startDate: undefined, endDate: undefined }));
  }

  function changeEndDate(endDate: string) {
    setEndEdited(true);
    update("endDate", endDate);
  }

  const tutorsMessage =
    tutorsState === "loading"
      ? "Chargement des tuteurs..."
      : tutorsState === "error"
        ? "Impossible de charger la liste des tuteurs. Fermez puis rouvrez la fenêtre."
        : tutors.length === 0
          ? "Aucun tuteur actif : créez d'abord un compte tuteur pour pouvoir enregistrer un stagiaire."
          : "";
  const canSubmit = tutorsState === "ready" && tutors.length > 0 && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    try {
      const result = await api<{ temporaryPassword: string }>("/api/stagiaires", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          startDate: dayToIsoUtc(form.startDate),
          endDate: dayToIsoUtc(form.endDate),
        }),
      });
      onCreated(result.temporaryPassword);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: "Un compte existe déjà avec cette adresse e-mail." });
      } else if (err instanceof ApiError && err.status === 400 && err.issues?.length) {
        const next: Partial<Record<Field, string>> = {};
        let unmatched = false;
        for (const issue of err.issues) {
          const field = issue.path[0];
          if (isField(field)) next[field] ??= FIELD_MESSAGES[field];
          else unmatched = true;
        }
        setFieldErrors(next);
        setFormError(unmatched ? "Certaines données sont invalides. Vérifiez le formulaire." : "");
      } else {
        setFormError(err instanceof Error ? err.message : "La création du stagiaire a échoué.");
      }
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (!saving) onClose();
  }

  function fieldError(field: Field) {
    const message = fieldErrors[field];
    return message ? (
      <span className="nouveau-stagiaire__field-error" id={`ns-${field}-error`} role="alert">
        {message}
      </span>
    ) : null;
  }

  function errorProps(field: Field) {
    return fieldErrors[field]
      ? { "aria-invalid": true, "aria-describedby": `ns-${field}-error` }
      : {};
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal-content nouveau-stagiaire"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ns-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="ns-title">Nouveau stagiaire</h2>
          <button className="icon-button" type="button" onClick={close} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form nouveau-stagiaire__form">
          {formError && (
            <p className="nouveau-stagiaire__form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-grid">
            <label>
              Prénom
              <input
                required
                minLength={2}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                {...errorProps("firstName")}
              />
              {fieldError("firstName")}
            </label>
            <label>
              Nom
              <input
                required
                minLength={2}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                {...errorProps("lastName")}
              />
              {fieldError("lastName")}
            </label>
          </div>
          <label>
            Adresse e-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              {...errorProps("email")}
            />
            {fieldError("email")}
          </label>
          <div className="form-grid">
            <label>
              École
              <input
                required
                minLength={2}
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
                {...errorProps("school")}
              />
              {fieldError("school")}
            </label>
            <label>
              Filière
              <input
                required
                minLength={2}
                value={form.fieldOfStudy}
                onChange={(e) => update("fieldOfStudy", e.target.value)}
                {...errorProps("fieldOfStudy")}
              />
              {fieldError("fieldOfStudy")}
            </label>
          </div>
          <div className="form-grid">
            <label>
              Niveau d'études
              <select
                required
                value={form.level}
                onChange={(e) => update("level", e.target.value)}
                {...errorProps("level")}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {fieldError("level")}
            </label>
            <label>
              Type de stage
              <select
                value={form.typeStage}
                onChange={(e) => update("typeStage", e.target.value as TypeStage)}
                {...errorProps("typeStage")}
              >
                {STAGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {fieldError("typeStage")}
            </label>
          </div>
          <label>
            Tuteur
            <select
              required
              value={form.tutorId}
              disabled={tutorsState !== "ready" || tutors.length === 0}
              onChange={(e) => update("tutorId", e.target.value)}
              {...errorProps("tutorId")}
            >
              <option value="">Choisir un tuteur</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.firstName} {tutor.lastName}
                </option>
              ))}
            </select>
            {fieldError("tutorId")}
          </label>
          <div className="form-grid">
            <label>
              Date de début
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => changeStartDate(e.target.value)}
                {...errorProps("startDate")}
              />
              {fieldError("startDate")}
            </label>
            <label>
              Date de fin
              <input
                type="date"
                required
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => changeEndDate(e.target.value)}
                {...errorProps("endDate")}
              />
              {fieldError("endDate")}
            </label>
          </div>
          <label>
            Sujet de stage
            <input
              required
              minLength={3}
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              {...errorProps("subject")}
            />
            {fieldError("subject")}
          </label>
          <label>
            Service
            <input
              required
              minLength={2}
              value={form.service}
              onChange={(e) => update("service", e.target.value)}
              {...errorProps("service")}
            />
            {fieldError("service")}
          </label>
          {tutorsMessage && (
            <p className="nouveau-stagiaire__hint" role="status">
              {tutorsMessage}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {saving ? "Création en cours..." : "Créer le compte stagiaire"}
          </button>
        </form>
      </div>
    </div>
  );
}
