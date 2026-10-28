import { es } from "@/lib/i18n/es";
import type { HealthLevel } from "@/lib/home/health";
import { HouseIllustration } from "@/components/home/HouseIllustration";

const levelTone: Record<HealthLevel, string> = {
  great: "bg-ok-bg text-ok",
  good: "bg-ok-bg text-ok",
  attention: "bg-soon-bg text-soon",
  critical: "bg-late-bg text-late",
};
const dot: Record<HealthLevel, string> = { great: "bg-ok-bar", good: "bg-ok-bar", attention: "bg-soon-bar", critical: "bg-late-bar" };

/** Arco de 0 a 100 (semicírculo). */
function Gauge({ score }: { score: number }) {
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="relative h-[92px] w-[128px]">
      <svg viewBox="0 0 128 78" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge" x1="0" x2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <path d="M12 68a52 52 0 0 1 104 0" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M12 68a52 52 0 0 1 104 0"
          fill="none"
          stroke="url(#gauge)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(len * score) / 100} ${len}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center leading-none">
        <span className="block text-[38px] font-extrabold">{score}</span>
        <span className="text-xs text-muted">{es.health.outOf}</span>
      </div>
    </div>
  );
}

export function HealthCard({ householdName, score, level, weekCount }: { householdName: string; score: number; level: HealthLevel; weekCount: number }) {
  return (
    <section className="card relative overflow-hidden p-5" aria-label="Salud del hogar">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-wider text-muted">{es.health.title}</p>
          <h2 className="truncate text-xl font-extrabold">{householdName}</h2>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${levelTone[level]}`}>
          <span className={`size-2 rounded-full ${dot[level]}`} />
          {es.health.levels[level]}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="space-y-2">
          <Gauge score={score} />
          <p className="text-sm text-muted">{weekCount > 0 ? es.health.tasksWeek(weekCount) : es.health.noTasks}</p>
        </div>
        <HouseIllustration className="-mb-2 w-[52%] max-w-[190px]" />
      </div>
    </section>
  );
}
