export type IntervalUnit = "day" | "week" | "month" | "year";
export type DueStatus = "overdue" | "soon" | "ok";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Suma un intervalo en UTC. Los meses se ajustan al último día (31 ene + 1 mes = 28/29 feb). */
export function addInterval(from: Date, value: number, unit: IntervalUnit): Date {
  const d = new Date(from.getTime());
  switch (unit) {
    case "day":
      d.setUTCDate(d.getUTCDate() + value);
      break;
    case "week":
      d.setUTCDate(d.getUTCDate() + 7 * value);
      break;
    case "month":
    case "year": {
      const months = unit === "year" ? value * 12 : value;
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + months);
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, lastDay));
    }
  }
  return d;
}

const startOfUtcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Días enteros hasta el vencimiento (negativo si ya venció). */
export function daysUntil(nextDue: Date, now: Date): number {
  return Math.round((startOfUtcDay(nextDue) - startOfUtcDay(now)) / DAY_MS);
}

export function dueStatus(nextDue: Date, now: Date, soonDays = 14): DueStatus {
  const days = daysUntil(nextDue, now);
  if (days < 0) return "overdue";
  return days <= soonDays ? "soon" : "ok";
}

/** Próximo vencimiento al completar un mantenimiento: cuenta desde la fecha en que se hizo. */
export function nextDueAfter(doneAt: Date, intervalValue: number, intervalUnit: IntervalUnit): Date {
  return addInterval(doneAt, intervalValue, intervalUnit);
}

/** Momento en que debe enviarse el recordatorio. */
export const reminderFireAt = (nextDue: Date, remindDaysBefore: number) =>
  addInterval(nextDue, -remindDaysBefore, "day");

/** 'YYYY-MM-DD' ⇄ Date (medianoche UTC). */
export const parseDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const formatDateOnly = (d: Date) => d.toISOString().slice(0, 10);
