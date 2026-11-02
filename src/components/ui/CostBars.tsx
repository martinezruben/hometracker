import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import type { MonthCost } from "@/lib/appliances/cost";

/** Barras de gasto por mes; el mes actual va resaltado y cada barra lleva su monto como texto. */
export function CostBars({ months }: { months: MonthCost[] }) {
  const max = Math.max(...months.map((m) => m.total), 0);
  const total = months.reduce((n, m) => n + m.total, 0);
  const summary = months.filter((m) => m.total > 0).map((m) => `${m.label} ${formatMoney(m.total)}`).join(", ");
  return (
    <div className="card space-y-4 border border-border p-5">
      <p className="text-4xl font-extrabold leading-none">
        {formatMoney(total)} <span className="text-base font-medium text-muted">{es.costBars.total}</span>
      </p>
      <div role="img" aria-label={`${es.costBars.title}: ${summary || es.costBars.none}`} className="flex h-36 items-end gap-3">
        {months.map((m, i) => {
          const last = i === months.length - 1;
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              {m.total > 0 && <span className="text-[12px] font-bold">{formatMoney(m.total).replace(/\D00$/, "")}</span>}
              <span
                className={`w-full rounded-xl ${m.total > 0 ? (last ? "bg-brand" : "bg-primary/55") : "bg-border"}`}
                style={{ height: m.total > 0 ? `${Math.max(10, (m.total / max) * 100)}%` : 5 }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex gap-3 text-center text-[13px] text-muted">
        {months.map((m, i) => (
          <span key={m.month} className={`flex-1 ${i === months.length - 1 ? "font-bold text-foreground" : ""}`}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}
