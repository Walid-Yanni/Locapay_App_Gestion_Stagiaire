export type UserRole = "ADMIN_RH" | "RESPONSABLE_RH" | "TUTEUR" | "STAGIAIRE";
export type StageStatus = "EN_COURS" | "TERMINE" | "ANNULE";
export type StageType = "OBLIGATOIRE" | "INITIATION" | "PROFESSIONNEL";
export type ActivityStatus = "BROUILLON" | "SOUMISE" | "VALIDEE" | "REJETEE";
export type ActivityCategory = "DEVELOPPEMENT" | "REUNION" | "FORMATION" | "RECHERCHE" | "DOCUMENTATION" | "AUTRE";
export type ReportStatus = "BROUILLON" | "GENERE" | "SIGNE";
export type ReportType = "MENSUEL" | "FINAL";
export type NotificationType = "INFO" | "ACTIVITY_SUBMITTED" | "ACTIVITY_VALIDATED" | "REPORT_GENERATED" | "STAGE_ENDING";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Stagiaire {
  id: string;
  userId: string;
  school: string;
  fieldOfStudy: string;
  level: string;
  startDate: string;
  endDate: string;
  typeStage: StageType;
  subject: string;
  service: string;
  tutorId: string;
  status: StageStatus;
  user?: User;
  tutor?: User;
}

export interface Activity {
  id: string;
  stagiaireId: string;
  date: string;
  category: ActivityCategory;
  description: string;
  durationMinutes: number;
  status: ActivityStatus;
  tutorComment?: string | null;
}

export interface Evaluation {
  id: string;
  stagiaireId: string;
  evaluatorId: string;
  technicalScore: number;
  communicationScore: number;
  autonomyScore: number;
  punctualityScore: number;
  comment: string;
  createdAt: string;
}

export interface Report {
  id: string;
  stagiaireId: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  generatedAt?: string | null;
  signedAt?: string | null;
  signedByTutor: boolean;
  signedByRH: boolean;
  signedByStagiaire: boolean;
  pdfUrl?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface StagiaireSkill {
  id: string;
  stagiaireId: string;
  skillId: string;
  level: number;
  validatedAt?: string | null;
  skill?: Skill;
}

export interface Document {
  id: string;
  stagiaireId: string;
  ownerId: string;
  name: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

