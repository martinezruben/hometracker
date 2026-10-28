import { es } from "@/lib/i18n/es";
import type { TaskView } from "./groups";

/** "18:00" → "6:00 p. m." */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const weekday = (ymd: string) => {
  const w = new Date(`${ymd}T00:00:00.000Z`).toLocaleDateString("es", { timeZone: "UTC", weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1);
};

export function repeatText(rule: string | null): string | null {
  const m = rule?.match(/^(\d+):(day|week|month|year)$/);
  if (!m) return null;
  const key = `${m[1]}:${m[2]}` as keyof typeof es.tasks.repeat;
  return es.tasks.repeat[key] ?? es.tasks.repeatsEvery[m[2] as "day" | "week" | "month" | "year"];
}

/** Subtítulo de una fila: hora, categoría, repetición, día de la semana (en "esta semana") y pasos. */
export function taskSubtitle(t: TaskView, opts: { showWeekday?: boolean } = {}): string[] {
  return [
    opts.showWeekday && t.dueAt ? weekday(t.dueAt) : null,
    t.dueTime ? timeLabel(t.dueTime) : null,
    t.category,
    repeatText(t.repeatRule),
    t.stepsTotal > 0 ? es.tasks.steps(t.stepsDone, t.stepsTotal) : null,
  ].filter((x): x is string => !!x);
}
