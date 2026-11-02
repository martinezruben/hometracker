/** Línea de tiempo: eventos pasados y futuros ordenados, y tiempo relativo en español (puro, con pruebas). */
import { daysUntil, nextDueAfter, type IntervalUnit } from "@/lib/maintenance/schedule";

export type TimelineTone = "ok" | "soon" | "overdue" | "info";
export type TimelineKind = "purchase" | "warranty" | "done" | "due" | "task" | "expense";

export type TimelineEvent = {
  id: string;
  at: Date;
  kind: TimelineKind;
  tone: TimelineTone;
  title: string;
  detail?: string;
  href?: string;
};

/** "hace 3 h", "ayer", "en 5 días"… (días calendario según `daysUntil`, horas y minutos si fue hoy). */
export function relativeTime(at: Date, now: Date): string {
  const diffMs = at.getTime() - now.getTime();
  const days = daysUntil(at, now);
  if (days === 0) {
    const mins = Math.round(Math.abs(diffMs) / 60000);
    if (mins < 1) return "ahora";
    const span = mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`;
    return diffMs < 0 ? `hace ${span}` : `en ${span}`;
  }
  if (days === -1) return "ayer";
  if (days === 1) return "mañana";
  if (days < 0) return days > -60 ? `hace ${-days} días` : `hace ${Math.round(-days / 30)} meses`;
  return days < 60 ? `en ${days} días` : `en ${Math.round(days / 30)} meses`;
}

/** Futuros (del más cercano al más lejano) y pasados (del más reciente al más antiguo). */
export function splitTimeline(events: TimelineEvent[], now: Date) {
  const upcoming = events.filter((e) => e.at.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime());
  const past = events.filter((e) => e.at.getTime() <= now.getTime()).sort((a, b) => b.at.getTime() - a.at.getTime());
  return { upcoming, past };
}

type ApplianceLike = { id: string; purchaseDate: Date | null; warrantyUntil: Date | null };
type PlanLike = { id: string; title: string; nextDue: Date };
type LogLike = { id: string; planId: string | null; doneAt: Date; cost: number | null; providerId: string | null; notes: string | null };
type PlanSchedule = PlanLike & { intervalValue: number; intervalUnit: IntervalUnit };

/** Compra, garantía, mantenimientos hechos y próximos vencimientos de un equipo, en un solo hilo. */
export function buildApplianceTimeline(
  a: ApplianceLike,
  plans: PlanSchedule[],
  logs: LogLike[],
  now: Date,
  text: {
    purchased: string;
    warrantyEnds: (past: boolean) => string;
    planDone: (title: string) => string;
    doneDetail: (log: LogLike, next: Date | null) => string;
    dueLabel: (days: number) => string;
  },
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  if (a.purchaseDate) ev.push({ id: "purchase", at: a.purchaseDate, kind: "purchase", tone: "info", title: text.purchased });
  if (a.warrantyUntil) {
    const past = a.warrantyUntil.getTime() <= now.getTime();
    ev.push({ id: "warranty", at: a.warrantyUntil, kind: "warranty", tone: past ? "overdue" : "ok", title: text.warrantyEnds(past) });
  }
  for (const l of logs) {
    const plan = plans.find((p) => p.id === l.planId);
    ev.push({
      id: `log-${l.id}`,
      at: l.doneAt,
      kind: "done",
      tone: "ok",
      title: text.planDone(plan?.title ?? ""),
      detail: text.doneDetail(l, plan ? nextDueAfter(l.doneAt, plan.intervalValue, plan.intervalUnit) : null),
    });
  }
  for (const p of plans) {
    const days = daysUntil(p.nextDue, now);
    ev.push({ id: `due-${p.id}`, at: p.nextDue, kind: "due", tone: days < 0 ? "overdue" : days <= 14 ? "soon" : "ok", title: p.title, detail: text.dueLabel(days) });
  }
  return ev;
}
