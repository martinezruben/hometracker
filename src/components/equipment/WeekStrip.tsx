import Link from "next/link";
import { es } from "@/lib/i18n/es";
import type { DueStatus } from "@/lib/maintenance/schedule";

const dot: Record<DueStatus, string> = { overdue: "bg-late-bar", soon: "bg-soon-bar", ok: "bg-ok-bar" };

export type DayMark = { date: string; status: DueStatus | null };

/** Lunes de la semana de `d` (UTC). */
export function startOfWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/** Tira de 7 días (lunes a domingo): hoy en azul y un punto de color bajo los días con eventos. */
export function WeekStrip({ days, today }: { days: DayMark[]; today: string }) {
  return (
    <ol className="flex justify-between gap-1.5" aria-label="Semana">
      {days.map((d, i) => {
        const isToday = d.date === today;
        return (
          <li key={d.date}>
            <Link
              href={`/calendar?d=${d.date}`}
              aria-current={isToday ? "date" : undefined}
              className={`flex h-[72px] w-[44px] flex-col items-center justify-center gap-1 rounded-full ${isToday ? "bg-primary text-white shadow-[0_6px_14px_rgb(29_78_216/0.35)]" : "card"}`}
            >
              <span className={`text-[11px] font-bold ${isToday ? "text-white" : "text-muted"}`}>{es.calendarPage.weekdays[i]}</span>
              <span className="text-lg font-extrabold leading-none">{Number(d.date.slice(8))}</span>
              <span className={`size-1.5 rounded-full ${d.status ? (isToday ? "bg-white" : dot[d.status]) : "opacity-0"}`} />
              {d.status && <span className="sr-only">, {es.calendarPage.hasEvents}</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
