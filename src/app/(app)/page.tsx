import { requireActiveHousehold } from "@/lib/auth/access";
import Link from "next/link";
import { upcomingMaintenance } from "@/lib/appliances/data";
import { es } from "@/lib/i18n/es";
import { Avatar, initialOf } from "@/components/ui/Avatar";
import { DueBadge } from "@/components/DueBadge";
import { upcomingTasks } from "@/lib/tasks/data";
import { InstallHint } from "@/components/InstallHint";

export default async function HomePage() {
  const { user, household } = await requireActiveHousehold();
  const [upcoming, tasks] = await Promise.all([upcomingMaintenance(household.id, 5), upcomingTasks(household.id, 5)]);
  const now = new Date();
  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight">{es.home.title}</h1>
          <p className="text-muted">{household.name}</p>
        </div>
        <Link href="/more" aria-label={es.nav.settings} className="flex size-11 items-center justify-center">
          <Avatar seed={user.id} label={initialOf(user.name, user.email)} />
        </Link>
      </header>
      <Link href="/search" className="flex min-h-12 items-center card px-4 text-muted">
        🔍 {es.search.open}
      </Link>
      <InstallHint />
      <div>
        <h2 className="font-semibold">{es.home.nextMaintenance}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 card p-4 text-muted">
            {es.home.nextMaintenanceEmpty}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border card">
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{es.home.tasks}</h2>
          <Link href="/tasks" className="min-h-11 py-2.5 text-sm text-link underline">{es.tasks.seeAll}</Link>
        </div>
        {tasks.length === 0 ? (
          <p className="mt-2 card p-4 text-muted">{es.tasks.homeEmpty}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border card">
            {tasks.map((t) => (
              <li key={t.id} className="flex min-h-14 items-center justify-between gap-3 p-4">
                <span className="truncate">{t.title}</span>
                {t.dueAt && <DueBadge nextDue={t.dueAt} now={now} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="font-semibold">{es.home.recentBoxes}</h2>
        <p className="mt-2 card p-4 text-muted">
          {es.home.recentBoxesEmpty}
        </p>
      </div>
    </section>
  );
}
