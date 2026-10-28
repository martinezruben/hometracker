import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { monthSummary } from "@/lib/expenses/data";
import { currentMonth, MONTH_RE, monthLabel, shiftMonth } from "@/lib/expenses/month";
import { formatDate, formatMoney } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { PendingCreates } from "@/components/PendingCreates";

const t = es.expenses;
const navCls = "flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: m } = await searchParams;
  const month = m && MONTH_RE.test(m) ? m : currentMonth();
  const { household } = await requireActiveHousehold();
  const { items, byCategory, total } = await monthSummary(household.id, month);
  const max = Math.max(...byCategory.map((c) => c.total), 1);
  const isCurrent = month === currentMonth();
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        {household.role !== "viewer" && (
          <Link href="/expenses/new" className="min-h-11 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white dark:text-slate-900">
            {t.new}
          </Link>
        )}
      </header>

      <div className="flex items-center justify-between">
        <Link href={`/expenses?month=${shiftMonth(month, -1)}`} aria-label={t.prevMonth} className={navCls}>‹</Link>
        <p className="font-semibold">{monthLabel(month)}</p>
        {isCurrent ? <span className="size-11" /> : <Link href={`/expenses?month=${shiftMonth(month, 1)}`} aria-label={t.nextMonth} className={navCls}>›</Link>}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted">{t.total}</p>
        <p className="text-3xl font-bold">{formatMoney(total)}</p>
        {byCategory.length > 0 && (
          <ul className="mt-4 space-y-3" aria-label={t.byCategory}>
            {byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="text-muted">{formatMoney(c.total)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-border" role="presentation">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(4, (c.total / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PendingCreates op="expense-create" hint={t.pending} />
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id}>
              <Link href={`/expenses/${e.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="truncate text-sm text-muted">
                    {formatDate(e.spentAt)}
                    {e.category && ` · ${e.category}`}
                    {e.receiptKey && " · 📎"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{formatMoney(e.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
