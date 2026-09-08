const tones: Record<string, string> = {
  EN_COURS: "badge badge-green",
  TERMINE: "badge badge-blue",
  ANNULE: "badge badge-red",
  VALIDEE: "badge badge-green",
  SOUMISE: "badge badge-orange",
  REJETEE: "badge badge-red",
  GENERE: "badge badge-blue",
  SIGNE: "badge badge-green",
};

export function Badge({ value }: { value: string }) {
  return <span className={tones[value] ?? "badge"}>{value.replaceAll("_", " ")}</span>;
}
