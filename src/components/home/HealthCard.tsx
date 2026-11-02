import { es } from "@/lib/i18n/es";
import type { HealthLevel } from "@/lib/home/health";
import { HouseIllustration } from "@/components/home/HouseIllustration";
import { HealthFactors } from "@/components/home/HealthFactors";
import type { HealthFactor } from "@/lib/home/health";

const levelTone: Record<HealthLevel, string> = {
  great: "bg-ok-bg text-ok",
  good: "bg-ok-bg text-ok",
  attention: "bg-soon-bg text-soon",
  critical: "bg-late-bg text-late",
};
const dot: Record<HealthLevel, string> = { great: "bg-ok-bar", good: "bg-ok-bar", attention: "bg-soon-bar", critical: "bg-late-bar" };

/** Dial de 0 a 100: arco de 270° con marcas; el número va centrado dentro, sin tocar el trazo. */
function Gauge({ score }: { score: number }) {
  const r = 62;
  const cx = 80;
  const cy = 80;
  const sweep = 270;
  const polar = (deg: number, rad: number) => {
    const t = ((deg - 225) * Math.PI) / 180; // 0° = abajo a la izquierda
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const end = (sweep * Math.min(Math.max(score, 0), 100)) / 100;
  const [hx, hy] = polar(end, r);
  const ticks = Array.from({ length: 28 }, (_, i) => {
    const deg = (sweep * i) / 27;
    const [x1, y1] = polar(deg, r - 12);
    const [x2, y2] = polar(deg, r - (i % 9 === 0 ? 17 : 15));
    return { x1, y1, x2, y2, on: deg <= end };
  });
  return (
    <div className="relative size-[148px]" role="img" aria-label={`${score} ${es.health.outOf}`}>
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full text-link" aria-hidden fill="none" strokeLinecap="round">
        <defs>
          <linearGradient id="gauge" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" style={{ stopColor: "var(--link)" }} />
            <stop offset="1" style={{ stopColor: "var(--primary)" }} />
          </linearGradient>
        </defs>
        <path d={arc(0, sweep)} strokeWidth="10" className="stroke-border" />
        {score > 0 && (
          <path d={arc(0, end)} strokeWidth="10" stroke="url(#gauge)" style={{ filter: "drop-shadow(0 0 4px currentColor)" }} />
        )}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1.5" className={t.on ? "stroke-link" : "stroke-border"} strokeOpacity={t.on ? 0.8 : 1} />
        ))}
        <circle cx={hx} cy={hy} r="4" className="fill-card stroke-link" strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 leading-none">
        <span className="text-[36px] font-extrabold tracking-tight">{score}</span>
        <span className="mt-1 text-xs font-semibold text-muted">{es.health.outOf}</span>
      </div>
    </div>
  );
}

export function HealthCard({ householdName, score, level, weekCount, factors }: { householdName: string; score: number; level: HealthLevel; weekCount: number; factors: HealthFactor[] }) {
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
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Gauge score={score} />
          <p className="text-sm text-muted">{weekCount > 0 ? es.health.tasksWeek(weekCount) : es.health.noTasks}</p>
        </div>
        <HouseIllustration className="-mr-2 w-[56%] max-w-[210px]" />
      </div>
      <HealthFactors factors={factors} />
    </section>
  );
}
