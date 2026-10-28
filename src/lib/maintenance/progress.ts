import { addInterval, type IntervalUnit } from "./schedule";

/**
 * Avance del ciclo de un plan entre 0 y 1: cuánto del intervalo ya pasó desde el último
 * vencimiento previsto. Al llegar el vencimiento (o pasarse) vale 1.
 */
export function planProgress(nextDue: Date, value: number, unit: IntervalUnit, now: Date): number {
  const start = addInterval(nextDue, -value, unit).getTime();
  const total = nextDue.getTime() - start;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / total));
}

/** Texto corto del intervalo: "cada 3 meses", "cada año". */
export function intervalLabel(value: number, unit: IntervalUnit): string {
  const one = { day: "cada día", week: "cada semana", month: "cada mes", year: "cada año" } as const;
  const many = { day: "días", week: "semanas", month: "meses", year: "años" } as const;
  return value === 1 ? one[unit] : `cada ${value} ${many[unit]}`;
}
