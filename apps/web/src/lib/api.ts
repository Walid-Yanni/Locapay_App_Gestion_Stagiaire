const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erreur reseau" }));
    throw new Error(error.message ?? "Erreur API");
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const session = await api<Session>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("accessToken", session.accessToken);
  localStorage.setItem("user", JSON.stringify(session.user));
  return session;
}

export async function downloadReportPdf(reportId: string, filename: string) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/api/reports/${reportId}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Erreur téléchargement PDF" }));
    throw new Error(err.message ?? "Erreur téléchargement PDF");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

