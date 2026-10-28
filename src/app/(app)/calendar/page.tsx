import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { currentMonth, MONTH_RE, monthLabel, monthRange, shiftMonth } from "@/lib/expenses/month";
import { loadUpcoming } from "@/lib/home/upcoming";
import { es } from "@/lib/i18n/es";
import type { DueStatus } from "@/lib/maintenance/schedule";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { PageHeader } from "@/components/ui/PageHeader";

const t = es.calendarPage;
const dot: Record<DueStatus, string> = { overdue: "bg-late-bar", soon: "bg-soon-bar", ok: "bg-ok-bar" };
const rank: Record<DueStatus, number> = { ok: 0, soon: 1, overdue: 2 };
const navCls = "flex size-11 items-center justify-center rounded-full card";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const { m, d } = await searchParams;
  const { household } = await requireActiveHousehold();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const selectedFromD = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  const month = m && MONTH_RE.test(m) ? m : selectedFromD ? selectedFromD.slice(0, 7) : currentMonth(now);
  const selected = selectedFromD && selectedFromD.startsWith(month) ? selectedFromD : today.startsWith(month) ? today : `${month}-01`;

  const items = await loadUpcoming(household.id, now);
  const byDay = new Map<string, typeof items>();
  for (const i of items) {
    const key = i.date.toISOString().slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), i]);
  }

  // Cuadrícula de lunes a domingo que cubre el mes.
  const { start, end } = monthRange(month);
  const lead = (start.getUTCDay() + 6) % 7;
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, n) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), n + 1)).toISOString().slice(0, 10)),
  ];
  const link = (day: string) => `/calendar?m=${month}&d=${day}`;
  const dayItems = byDay.get(selected) ?? [];

  return (
    <section className="space-y-4">
      <Link href="/appliances" className="flex min-h-11 items-center gap-1 text-sm font-bold text-link"><ChevronLeftIcon width={18} height={18} /> {t.back}</Link>
      <PageHeader title={t.title} />

      <div className="flex items-center justify-between">
        <Link href={`/calendar?m=${shiftMonth(month, -1)}`} aria-label={t.prev} className={navCls}><ChevronLeftIcon width={20} height={20} /></Link>
        <h2 className="text-lg font-extrabold">{monthLabel(month)}</h2>
        <Link href={`/calendar?m=${shiftMonth(month, 1)}`} aria-label={t.next} className={navCls}><ChevronRightIcon width={20} height={20} /></Link>
      </div>

      <div className="card p-3">
        <ul className="grid grid-cols-7 text-center text-[11px] font-bold text-muted" aria-hidden>
          {t.weekdaysShort.map((w) => <li key={w} className="py-1">{w}</li>)}
        </ul>
        <ul className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <li key={`e${i}`} />;
            const evs = byDay.get(day);
            const worst = evs?.reduce<DueStatus>((w, e) => (rank[e.status] > rank[w] ? e.status : w), "ok");
            const isSel = day === selected;
            return (
              <li key={day} className="flex justify-center">
                <Link
                  href={link(day)}
                  aria-current={day === today ? "date" : undefined}
                  className={`flex h-12 w-10 flex-col items-center justify-center gap-0.5 rounded-full text-[15px] font-extrabold ${isSel ? "bg-primary text-white" : day === today ? "text-link" : ""}`}
                >
                  {Number(day.slice(8))}
                  <span className={`size-1.5 rounded-full ${evs && worst ? (isSel ? "bg-white" : dot[worst]) : "opacity-0"}`} />
                  {evs && <span className="sr-only">, {es.calendarPage.hasEvents}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {dayItems.length === 0 ? (
        <p className="card p-4 text-muted">{t.nothing}</p>
      ) : (
        <ul className="space-y-3">{dayItems.map((i) => <UpcomingRow key={i.key} item={i} />)}</ul>
      )}
    </section>
  );
}
