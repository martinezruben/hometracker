// Agrupación de pendientes para la pantalla de Listas (funciones puras, sin base de datos).

export type TaskView = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:MM
  repeatRule: string | null;
  assignedTo: string | null;
  urgent: boolean;
  category: string | null;
  stepsTotal: number;
  stepsDone: number;
  pending?: boolean;
};

export type DoneTaskView = {
  id: string;
  title: string;
  doneAt: string; // ISO
  doneBy: string | null;
  assignedTo: string | null;
};

export type TaskGroups = {
  today: TaskView[];
  doneToday: DoneTaskView[];
  week: TaskView[];
  later: TaskView[];
  undated: TaskView[];
  olderDone: DoneTaskView[];
  summary: { doneWeek: number; totalWeek: number; pendingWeek: number; todayCount: number };
};

const dayMs = 86_400_000;
const toDay = (iso: string) => iso.slice(0, 10);

/** Lunes y domingo (YYYY-MM-DD) de la semana de `today`. */
export function weekBounds(today: string): { start: string; end: string } {
  const d = new Date(`${today}T00:00:00.000Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - offset * dayMs);
  return { start: start.toISOString().slice(0, 10), end: new Date(start.getTime() + 6 * dayMs).toISOString().slice(0, 10) };
}

const byUrgency = (a: TaskView, b: TaskView) =>
  Number(b.urgent) - Number(a.urgent) ||
  (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
  (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") ||
  a.title.localeCompare(b.title);

/** Hoy (incluye vencidos) · Esta semana · Más adelante · Sin fecha, más el resumen semanal. */
export function groupTasks(open: TaskView[], done: DoneTaskView[], today: string): TaskGroups {
  const { start, end } = weekBounds(today);
  const sorted = [...open].sort(byUrgency);
  const todayList = sorted.filter((t) => t.dueAt !== null && t.dueAt <= today);
  const week = sorted.filter((t) => t.dueAt !== null && t.dueAt > today && t.dueAt <= end);
  const later = sorted.filter((t) => t.dueAt !== null && t.dueAt > end);
  const undated = sorted.filter((t) => t.dueAt === null);

  const doneToday = done.filter((d) => toDay(d.doneAt) === today);
  const doneWeekList = done.filter((d) => toDay(d.doneAt) >= start && toDay(d.doneAt) <= end);
  const olderDone = done.filter((d) => toDay(d.doneAt) < start).slice(0, 15);
  const pendingWeek = todayList.length + week.length;

  return {
    today: todayList,
    doneToday,
    week,
    later,
    undated,
    olderDone,
    summary: { doneWeek: doneWeekList.length, totalWeek: pendingWeek + doneWeekList.length, pendingWeek, todayCount: todayList.length },
  };
}

export type DayProgress = { date: string; planned: number; done: number };

/** Lunes a domingo de la semana de `today`: cuántos pendientes vencen cada día y cuántos se completaron. */
export function weekProgress(open: TaskView[], done: DoneTaskView[], today: string): DayProgress[] {
  const { start } = weekBounds(today);
  const first = new Date(`${start}T00:00:00.000Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(first + i * dayMs).toISOString().slice(0, 10);
    return {
      date,
      // los vencidos sin completar cuentan en hoy, igual que en la lista
      planned: open.filter((t) => t.dueAt !== null && (t.dueAt === date || (date === today && t.dueAt < today))).length,
      done: done.filter((d) => toDay(d.doneAt) === date).length,
    };
  });
}
