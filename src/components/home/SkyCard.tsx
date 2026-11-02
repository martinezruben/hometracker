"use client";

import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import { arcPath, dialMarks, greetingKey, polar, skyPhase } from "@/lib/home/dial";
import type { HealthLevel } from "@/lib/home/health";
import { PlusIcon } from "@/components/icons";
import { localParts, useNow } from "@/components/home/useNow";

export type DialTask = { id: string; title: string; dueAt: string | null; dueTime: string | null; urgent: boolean };
export type DialDone = { id: string; title: string; doneAt: string };

const C = 150;
const R = 112;
const levelTone: Record<HealthLevel, string> = { great: "fill-sky-ok", good: "fill-sky-ok", attention: "fill-sky-soon", critical: "fill-sky-late" };
const stars = [
  { x: "12%", y: "10%", s: 4, o: 0.8 },
  { x: "30%", y: "22%", s: 3, o: 0.6 },
  { x: "58%", y: "9%", s: 3, o: 0.7 },
  { x: "46%", y: "26%", s: 2, o: 0.5 },
];

/**
 * Tarjeta principal de Inicio: el cielo cambia con la hora del dispositivo y un dial de 24 horas muestra
 * la noche, los pendientes con hora, lo ya hecho y el momento actual; al centro, la salud del hogar.
 */
export function SkyCard({
  score,
  level,
  open,
  done,
  weekCount,
  monthExpenses,
  canEdit,
}: {
  score: number;
  level: HealthLevel;
  open: DialTask[];
  done: DialDone[];
  weekCount: number;
  monthExpenses: number;
  canEdit: boolean;
}) {
  const now = useNow();
  const parts = now ? localParts(now) : null;
  const phase = parts ? skyPhase(parts.hour) : "day";
  const marks = parts ? dialMarks(open, done, parts.day, (iso) => localParts(new Date(iso))) : [];
  const [nx, ny] = parts ? polar(C, C, R, parts.hour) : [C, C - R];
  const timeLabel = now ? now.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }) : "";
  const hello = parts ? es.greeting[greetingKey(parts.hour)] : es.greeting.hello;
  const label = (k: string) => (k === "task" ? es.dial.task : es.dial.done);
  const summary = marks.length
    ? es.dial.summary(marks.filter((m) => m.kind === "task").length, marks.filter((m) => m.kind === "done").length)
    : es.dial.empty;

  return (
    <section
      aria-label={es.health.title}
      data-sky={phase}
      className="relative overflow-hidden rounded-[32px] border border-border p-5 text-sky-ink shadow-[var(--shadow-card)]"
      style={{ background: `linear-gradient(165deg, var(--sky-${phase}-a), var(--sky-${phase}-b))` }}
    >
      {(phase === "night" || phase === "dawn") &&
        stars.map((s) => (
          <span key={s.x} aria-hidden className="absolute rounded-full bg-sky-ink" style={{ left: s.x, top: s.y, width: s.s, height: s.s, opacity: s.o }} />
        ))}
      <span aria-hidden className="absolute -right-8 -top-8 size-36 rounded-full bg-sky-orb" />

      <div className="relative flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{hello}</h2>
        {timeLabel && <span className="rounded-full bg-sky-panel px-3.5 py-1.5 text-[15px] font-semibold">{timeLabel}</span>}
      </div>

      <div className="relative mt-1 flex justify-center">
        <svg
          role="img"
          aria-label={`${es.health.title}: ${score} ${es.health.outOf}. ${summary}`}
          viewBox="0 0 300 300"
          className="h-auto w-full max-w-[310px]"
        >
          <circle cx={C} cy={C} r={130} fill="none" strokeWidth={7} strokeDasharray="1.6 9.6" className="stroke-sky-ink-muted" opacity={0.45} />
          <circle cx={C} cy={C} r={R} fill="none" strokeWidth={14} className="stroke-sky-ink-muted" opacity={0.22} />
          <path d={arcPath(C, C, R, 0, 6)} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-night-band" />
          <path d={arcPath(C, C, R, 20, 23.99)} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-night-band" />
          {marks.map((m) => {
            const [mx, my] = polar(C, C, R, (m.from + m.to) / 2);
            const task = m.kind === "task";
            return (
              <g key={m.id}>
                <title>{`${label(m.kind)}: ${m.title}`}</title>
                <path d={arcPath(C, C, R, m.from, m.to)} fill="none" strokeWidth={14} strokeLinecap="round" className={task ? "stroke-mark-task" : "stroke-ok-bar"} />
                {task && <circle cx={mx} cy={my} r={11} strokeWidth={3} className="fill-mark-task stroke-sky-panel" />}
              </g>
            );
          })}
          {parts && <circle cx={nx} cy={ny} r={9} strokeWidth={4} className="fill-sky-ink stroke-night-band" />}
          <text x={C} y={62} textAnchor="middle" fontSize={12} className="fill-sky-ink-muted">12 a. m.</text>
          <text x={238} y={154} textAnchor="end" fontSize={12} className="fill-sky-ink-muted">6 a. m.</text>
          <text x={C} y={246} textAnchor="middle" fontSize={12} className="fill-sky-ink-muted">12 p. m.</text>
          <text x={62} y={154} textAnchor="start" fontSize={12} className="fill-sky-ink-muted">6 p. m.</text>
          <text x={C} y={122} textAnchor="middle" fontSize={14} className="fill-sky-ink-muted">{es.health.shortTitle}</text>
          <text x={C} y={176} textAnchor="middle" fontSize={62} fontWeight={800} className="fill-sky-ink">{score}</text>
          <text x={C} y={198} textAnchor="middle" fontSize={14} fontWeight={700} className={levelTone[level]}>{es.health.levels[level]}</text>
        </svg>
      </div>

      <ul className="relative mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px]">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-mark-task" />{es.dial.task}</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ok-bar" />{es.dial.done}</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-ink" />{es.dial.now}</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-night-band" />{es.dial.night}</li>
      </ul>
      <p className="relative mt-2 text-center text-sm text-sky-ink-muted">{summary}</p>

      {canEdit && (
        <Link
          href="/lists?nuevo=1"
          className="relative mt-4 flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_22px_rgb(47_109_240/0.35)]"
        >
          <PlusIcon width={22} height={22} /> {es.dial.newTask}
        </Link>
      )}

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl bg-sky-panel px-4 py-3.5">
          <p className="text-[13px] text-sky-ink-muted">{es.health.statExpenses}</p>
          <p className="mt-0.5 text-2xl font-extrabold">{formatMoney(monthExpenses)}</p>
        </div>
        <div className="rounded-3xl bg-sky-panel px-4 py-3.5">
          <p className="text-[13px] text-sky-ink-muted">{es.dial.thisWeek}</p>
          <p className="mt-0.5 text-2xl font-extrabold">
            {weekCount} <span className="text-[15px] font-semibold text-sky-ink-muted">{es.dial.tasks(weekCount)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
