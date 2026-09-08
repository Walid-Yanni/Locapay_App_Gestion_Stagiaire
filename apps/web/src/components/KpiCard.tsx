import type React from "react";

export interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  hint?: string;
}

export function KpiCard({ title, value, icon, hint }: KpiCardProps) {
  return (
    <article className="kpi">
      <div>{icon}</div>
      <p>{title}</p>
      <strong>{value}</strong>
      {hint && <small style={{ display: "block", marginTop: "4px", color: "var(--muted)" }}>{hint}</small>}
    </article>
  );
}
