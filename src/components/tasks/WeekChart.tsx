import { es } from "@/lib/i18n/es";
import type { DayProgress } from "@/lib/tasks/groups";

/** Mini gráfico de la semana: por día, barra de lo que vence (azul) y de lo hecho (verde). */
export function WeekChart({ days, today }: { days: DayProgress[]; today: string }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.planned, d.done]));
  return (
    <section className="card space-y-3 p-4" aria-label={es.weekChart.title}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold">{es.weekChart.title}</h2>
        <p className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brand" />{es.weekChart.planned}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-ok-bar" />{es.weekChart.done}</span>
        </p>
      </div>
      <ul className="grid grid-cols-7 gap-2">
        {days.map((d, i) => (
          <li key={d.date} aria-label={es.weekChart.dayLabel(es.weekChart.days[i], d.planned, d.done)} className="flex flex-col items-center gap-1.5">
            <span className="flex h-16 items-end gap-1">
              <span className="w-2.5 rounded-t bg-brand" style={{ height: `${d.planned ? Math.max(8, (d.planned / max) * 100) : 4}%`, opacity: d.planned ? 1 : 0.25 }} />
              <span className="w-2.5 rounded-t bg-ok-bar" style={{ height: `${d.done ? Math.max(8, (d.done / max) * 100) : 4}%`, opacity: d.done ? 1 : 0.25 }} />
            </span>
            <span className={`flex size-7 items-center justify-center rounded-full text-xs font-extrabold ${d.date === today ? "bg-primary text-white" : "text-muted"}`}>{es.weekChart.days[i]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
