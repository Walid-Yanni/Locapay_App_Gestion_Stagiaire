// apps/web/src/hooks/useStagiaires.ts
import { useEffect, useState } from "react";
import type { Stagiaire } from "@locapay/shared-types";

export function useStagiaires() {
  const [data, setData] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    fetch(`${apiUrl}/api/stagiaires`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
