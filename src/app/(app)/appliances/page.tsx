import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { equipmentOverview } from "@/lib/appliances/overview";
import { listAppliances } from "@/lib/appliances/data";
import { loadUpcoming } from "@/lib/home/upcoming";
import { monthLabel } from "@/lib/expenses/month";
import { es } from "@/lib/i18n/es";
import type { DueStatus } from "@/lib/maintenance/schedule";
import { PlusIcon, SearchIcon, WrenchIcon } from "@/components/icons";
import { PlanCard } from "@/components/equipment/PlanCard";
import { startOfWeek, WeekStrip, type DayMark } from "@/components/equipment/WeekStrip";
import { PendingCreates } from "@/components/PendingCreates";
import { IconTile } from "@/components/ui/IconTile";
import { PageHeader } from "@/components/ui/PageHeader";

const t = es.appliances;
const dotColor = { overdue: "bg-late-bar", soon: "bg-soon-bar", ok: "bg-ok-bar" } as const;
const rank: Record<DueStatus, number> = { ok: 0, soon: 1, overdue: 2 };

export default async function AppliancesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { household } = await requireActiveHousehold();
  const now = new Date();
  const [overview, list, upcoming] = await Promise.all([equipmentOverview(household.id, now), listAppliances(household.id, q), loadUpcoming(household.id, now)]);

  // Tira semanal: puntos por día según lo más urgente que vence ese día.
  const monday = startOfWeek(now);
  const marks = new Map<string, DueStatus>();
  for (const i of upcoming) {
    const key = i.date.toISOString().slice(0, 10);
    const cur = marks.get(key);
    if (!cur || rank[i.status] > rank[cur]) marks.set(key, i.status);
  }
  const week: DayMark[] = Array.from({ length: 7 }, (_, n) => {
    const date = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + n)).toISOString().slice(0, 10);
    return { date, status: marks.get(date) ?? null };
  });
  const today = now.toISOString().slice(0, 10);
  const stats = (["overdue", "soon", "ok"] as const).map((k) => ({ k, n: overview.counts[k] }));

  return (
    <section className="space-y-5">
      <PageHeader
        title={t.title}
        subtitle={t.summary(overview.appliancesTotal, overview.attention)}
        action={
          household.role !== "viewer" && (
            <Link href="/appliances/new" aria-label={t.new} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgb(29_78_216/0.35)]">
              <PlusIcon width={24} height={24} />
            </Link>
          )
        }
      />

      <ul className="grid grid-cols-3 gap-3" aria-label="Resumen">
        {stats.map(({ k, n }) => (
          <li key={k} className="card p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <span className={`size-2 rounded-full ${dotColor[k]}`} />
              <span className={k === "overdue" ? "text-late" : k === "soon" ? "text-soon" : "text-ok"}>{t.stat[k]}</span>
            </p>
            <p className="mt-1.5 text-3xl font-extrabold leading-none">{n}</p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">{monthLabel(today.slice(0, 7))}</h2>
        <Link href="/calendar" className="flex min-h-11 items-center text-sm font-bold text-link">{t.calendar}</Link>
      </div>
      <WeekStrip days={week} today={today} />

      <h2 className="pt-1 text-xl font-extrabold">{t.maintenanceTitle}</h2>
      <PendingCreates op="appliance-create" hint={t.pendingAppliance} />
      {overview.plans.length === 0 ? (
        <p className="card p-4 text-muted">{t.emptyPlans}</p>
      ) : (
        <ul className="space-y-3">{overview.plans.map((p) => <PlanCard key={p.id} plan={p} />)}</ul>
      )}

      <h2 className="pt-1 text-xl font-extrabold">{t.allAppliances}</h2>
      <form action="/appliances" method="get" role="search" className="card flex min-h-12 items-center gap-3 rounded-full px-4">
        <SearchIcon width={20} height={20} className="shrink-0 text-muted" />
        <input name="q" type="search" aria-label={t.searchPlaceholder} defaultValue={q} placeholder={t.searchPlaceholder} className="min-h-12 w-full bg-transparent text-base outline-none" />
      </form>
      {list.length === 0 ? (
        <p className="card p-4 text-muted">{q ? t.emptySearch : t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/appliances/${a.id}`} className="card flex min-h-16 items-center gap-3 p-3">
                <IconTile tint="blue"><WrenchIcon width={22} height={22} /></IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{a.name}</p>
                  <p className="truncate text-sm text-muted">{[a.brand, a.model, a.location].filter(Boolean).join(" · ")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
