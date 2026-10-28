import { requireActiveHousehold } from "@/lib/auth/access";
import Link from "next/link";
import { upcomingMaintenance } from "@/lib/appliances/data";
import { es } from "@/lib/i18n/es";
import { DueBadge } from "@/components/DueBadge";

export default async function HomePage() {
  const { household } = await requireActiveHousehold();
  const upcoming = await upcomingMaintenance(household.id, 5);
  const now = new Date();
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{es.home.title}</h1>
        <p className="text-muted">{household.name}</p>
      </header>
      <div>
        <h2 className="font-semibold">{es.home.nextMaintenance}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 rounded-xl border border-border bg-card p-4 text-muted">
            {es.home.nextMaintenanceEmpty}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
            {upcoming.map((u) => (
              <li key={u.planId}>
                <Link href={`/appliances/${u.applianceId}`} className="flex min-h-14 items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.title}</p>
                    <p className="truncate text-sm text-muted">{u.applianceName}</p>
                  </div>
                  <DueBadge nextDue={u.nextDue} now={now} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="font-semibold">{es.home.recentBoxes}</h2>
        <p className="mt-2 rounded-xl border border-border bg-card p-4 text-muted">
          {es.home.recentBoxesEmpty}
        </p>
      </div>
    </section>
  );
}
