/** Geometría y datos del dial de 24 horas de Inicio (puro, con pruebas). 0 h arriba, sentido horario. */

export type SkyPhase = "dawn" | "day" | "dusk" | "night";

export const skyPhase = (hour: number): SkyPhase => (hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 20 ? "dusk" : "night");

export const greetingKey = (hour: number) => (hour < 12 ? "morning" : hour < 19 ? "afternoon" : "evening") as "morning" | "afternoon" | "evening";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function polar(cx: number, cy: number, r: number, hour: number): [number, number] {
  const a = (hour / 24) * 2 * Math.PI;
  return [round1(cx + r * Math.sin(a)), round1(cy - r * Math.cos(a))];
}

/** Arco SVG entre dos horas del día (de `from` a `to`, horas decimales; `to` > `from`). */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to >= from + 24 ? from + 23.999 : to);
  return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 12 ? 1 : 0} 1 ${x2} ${y2}`;
}

export type DialMark = { id: string; kind: "task" | "done"; from: number; to: number; title: string };

type OpenTask = { id: string; title: string; dueAt: string | null; dueTime: string | null; urgent: boolean };
type DoneTask = { id: string; title: string; doneAt: string };

const MIN_SPAN = 0.45; // un arco nunca es más fino que ~27 min para que se vea

const hhmm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
};

/**
 * Marcas del día: pendientes con hora (violeta) y completados hoy (acento).
 * `local` convierte un instante ISO a día y hora locales del dispositivo.
 */
export function dialMarks(open: OpenTask[], done: DoneTask[], today: string, local: (iso: string) => { day: string; hour: number }): DialMark[] {
  const marks: DialMark[] = [];
  for (const t of open) {
    if (t.dueAt === today && t.dueTime) {
      const from = hhmm(t.dueTime);
      marks.push({ id: t.id, kind: "task", from, to: Math.min(24, from + MIN_SPAN), title: t.title });
    }
  }
  for (const d of done) {
    const l = local(d.doneAt);
    if (l.day === today) marks.push({ id: `done-${d.id}`, kind: "done", from: l.hour, to: Math.min(24, l.hour + MIN_SPAN), title: d.title });
  }
  return marks.sort((a, b) => a.from - b.from);
}

export type NextUp = { task: OpenTask; minutes: number | null } | null;

/** El siguiente pendiente: con hora y aún por llegar; si no, sin hora de hoy; si no, el vencido más antiguo. */
export function nextUp(open: OpenTask[], today: string, nowHour: number): NextUp {
  const dueToday = open.filter((t) => t.dueAt === today);
  const timed = dueToday.filter((t) => t.dueTime && hhmm(t.dueTime) >= nowHour).sort((a, b) => hhmm(a.dueTime!) - hhmm(b.dueTime!));
  if (timed[0]) return { task: timed[0], minutes: Math.round((hhmm(timed[0].dueTime!) - nowHour) * 60) };
  const untimed = dueToday.filter((t) => !t.dueTime).sort((a, b) => Number(b.urgent) - Number(a.urgent));
  if (untimed[0]) return { task: untimed[0], minutes: null };
  const late = open.filter((t) => t.dueAt && t.dueAt < today).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  if (late[0]) return { task: late[0], minutes: null };
  const passed = dueToday.filter((t) => t.dueTime).sort((a, b) => hhmm(b.dueTime!) - hhmm(a.dueTime!));
  return passed[0] ? { task: passed[0], minutes: null } : null;
}

/** "3 h 41 min" / "25 min" / "ahora". */
export function untilLabel(minutes: number): string {
  if (minutes <= 0) return "ahora";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}
