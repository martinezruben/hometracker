import { es } from "@/lib/i18n/es";
import type { HealthFactor, HealthFactorKey } from "@/lib/home/health";

const tone: Record<HealthFactorKey, string> = {
  overdueMaintenance: "bg-late-bar",
  overdueTasks: "bg-late-bar",
  expiredDocuments: "bg-late-bar",
  soonMaintenance: "bg-soon-bar",
  expiringDocuments: "bg-soon-bar",
};

/** Desglose del puntaje: qué lo baja y cuántos puntos resta cada cosa. */
export function HealthFactors({ factors }: { factors: HealthFactor[] }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <h3 className="text-[11px] font-extrabold tracking-wider text-muted">{es.health.factorsTitle.toUpperCase()}</h3>
      {factors.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ok">
          <span className="size-2 shrink-0 rounded-full bg-ok-bar" />
          {es.health.allGood}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {factors.map((f) => (
            <li key={f.key} className="flex items-center gap-2 text-sm">
              <span className={`size-2 shrink-0 rounded-full ${tone[f.key]}`} />
              <span className="min-w-0 flex-1 font-semibold">{es.health.factors[f.key](f.count)}</span>
              <span className="shrink-0 rounded-full bg-tile px-2 py-0.5 text-xs font-extrabold">−{f.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
