export type HealthInput = {
  overdueMaintenance: number;
  soonMaintenance: number; // vencen en los próximos 14 días
  overdueTasks: number;
  expiredDocuments: number;
  expiringDocuments: number; // vencen en los próximos 30 días
};

export type HealthLevel = "great" | "good" | "attention" | "critical";

const cap = (n: number, per: number, max: number) => Math.min(max, n * per);

/** Puntaje de salud del hogar de 0 a 100: parte de 100 y resta por pendientes vencidos. */
export function healthScore(i: HealthInput): number {
  const penalty =
    cap(i.overdueMaintenance, 12, 48) +
    cap(i.soonMaintenance, 3, 12) +
    cap(i.overdueTasks, 5, 20) +
    cap(i.expiredDocuments, 5, 10) +
    cap(i.expiringDocuments, 2, 6);
  return Math.max(0, Math.round(100 - penalty));
}

export function healthLevel(score: number): HealthLevel {
  if (score >= 85) return "great";
  if (score >= 65) return "good";
  if (score >= 40) return "attention";
  return "critical";
}
