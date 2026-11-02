import { es } from "@/lib/i18n/es";
import type { CategoryShare } from "@/lib/boxes/insights";

/** Reparto del contenido por categoría: barra proporcional + unidades. Texto siempre visible (no solo color). */
export function CategoryBars({ shares }: { shares: CategoryShare[] }) {
  if (shares.length === 0) return null;
  return (
    <section className="space-y-3" aria-label={es.boxInsights.categoriesTitle}>
      <h2 className="text-xl font-extrabold">{es.boxInsights.categoriesTitle}</h2>
      <ul className="space-y-3 rounded-2xl bg-tile p-4">
        {shares.map((s) => (
          <li key={s.category ?? "none"} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-bold">{s.category ?? es.boxInsights.uncategorized}</span>
              <span className="shrink-0 text-muted">{es.boxInsights.units(s.units)} · {s.pct}%</span>
            </div>
            <span role="presentation" className="block h-2 overflow-hidden rounded-full bg-border">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(4, s.pct)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
