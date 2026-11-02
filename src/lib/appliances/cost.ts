/** Gasto de mantenimiento por mes (UTC) de los últimos `months` meses, del más antiguo al actual. */
export type MonthCost = { month: string; label: string; total: number };

export function costByMonth(logs: { doneAt: Date; cost: number | null }[], now: Date, months = 6): MonthCost[] {
  const out: MonthCost[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("es", { timeZone: "UTC", month: "short" }).replace(".", "");
    const total = logs.filter((l) => l.cost != null && l.doneAt.toISOString().slice(0, 7) === month).reduce((n, l) => n + (l.cost ?? 0), 0);
    out.push({ month, label: label.charAt(0).toUpperCase() + label.slice(1), total: Math.round(total * 100) / 100 });
  }
  return out;
}
