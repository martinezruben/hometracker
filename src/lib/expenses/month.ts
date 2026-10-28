/** Mes "YYYY-MM" ⇄ rango de fechas en UTC. */

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const currentMonth = (now = new Date()) => now.toISOString().slice(0, 7);

/** Inicio (incluido) y fin (excluido) del mes. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export const monthLabel = (month: string) => {
  const { start } = monthRange(month);
  const label = start.toLocaleDateString("es", { timeZone: "UTC", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
