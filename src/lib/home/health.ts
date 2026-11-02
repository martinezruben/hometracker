export type HealthInput = {
  overdueMaintenance: number;
  soonMaintenance: number; // vencen en los próximos 14 días
  overdueTasks: number;
  expiredDocuments: number;
  expiringDocuments: number; // vencen en los próximos 30 días
};

export type HealthLevel = "great" | "good" | "attention" | "critical";

const cap = (n: number, per: number, max: number) => Math.min(max, n * per);

const RULES = [
  { key: "overdueMaintenance", per: 12, max: 48 },
  { key: "soonMaintenance", per: 3, max: 12 },
  { key: "overdueTasks", per: 5, max: 20 },
  { key: "expiredDocuments", per: 5, max: 10 },
  { key: "expiringDocuments", per: 2, max: 6 },
] as const;

export type HealthFactorKey = (typeof RULES)[number]["key"];
export type HealthFactor = { key: HealthFactorKey; count: number; points: number };

/** Qué le resta al puntaje: una entrada por categoría con problemas (la más pesada primero). */
export function healthFactors(i: HealthInput): HealthFactor[] {
  return RULES.map((r) => ({ key: r.key, count: i[r.key], points: cap(i[r.key], r.per, r.max) }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.points - a.points);
}

/** Puntaje de salud del hogar de 0 a 100: parte de 100 y resta por pendientes vencidos. */
export function healthScore(i: HealthInput): number {
  const penalty = healthFactors(i).reduce((sum, f) => sum + f.points, 0);
  return Math.max(0, Math.round(100 - penalty));
}

export function healthLevel(score: number): HealthLevel {
  if (score >= 85) return "great";
  if (score >= 65) return "good";
  if (score >= 40) return "attention";
  return "critical";
}
