import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { recentActivity } from "@/lib/home/activity";
import { es } from "@/lib/i18n/es";
import type { KindGroup } from "@/lib/timeline";
import { ActivityFeed } from "@/components/home/ActivityFeed";

const filters: ("all" | KindGroup)[] = ["all", "task", "maintenance", "expense", "box"];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const only = filters.includes(tipo as KindGroup) && tipo !== "all" ? (tipo as KindGroup) : undefined;
  const { household } = await requireActiveHousehold();
  const now = new Date();
  const events = await recentActivity(household.id, now, 60, only);

  return (
    <section className="space-y-5">
      <header className="leading-tight">
        <p className="text-base text-muted">{es.activity.subtitle(household.name)}</p>
        <h1 className="text-[44px] font-extrabold tracking-tight">{es.activity.pageTitle}</h1>
      </header>
      <nav aria-label={es.activity.pageTitle} className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {filters.map((f) => {
          const active = f === "all" ? !only : f === only;
          return (
            <Link
              key={f}
              href={f === "all" ? "/activity" : `/activity?tipo=${f}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 shrink-0 items-center rounded-full px-5 text-[16px] font-bold ${active ? "bg-dark text-card" : "card border border-border"}`}
            >
              {es.activity.filters[f]}
            </Link>
          );
        })}
      </nav>
      <ActivityFeed events={events} serverNow={now} />
    </section>
  );
}
