import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { equipmentOverview } from "@/lib/appliances/overview";
import { homeOverview } from "@/lib/home/upcoming";
import { homeStats } from "@/lib/home/stats";
import { homeDay } from "@/lib/home/day";
import { recentActivity } from "@/lib/home/activity";
import { splitTimeline } from "@/lib/timeline";
import { es } from "@/lib/i18n/es";
import { BellIcon, BoxIcon, ContactsIcon, FileIcon, ListIcon, SearchIcon, WalletIcon, WrenchIcon } from "@/components/icons";
import { HealthBreakdown } from "@/components/home/HealthBreakdown";
import { NextUpBanner } from "@/components/home/NextUp";
import { SkyCard } from "@/components/home/SkyCard";
import { StatTiles } from "@/components/home/StatTiles";
import { TodayLabel } from "@/components/home/TodayLabel";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { InstallHint } from "@/components/InstallHint";
import { Avatar, initialOf } from "@/components/ui/Avatar";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { StatusRing } from "@/components/ui/StatusRing";
import { Timeline } from "@/components/ui/Timeline";

const modules: { href: string; label: string; tint: Tint; Icon: typeof BoxIcon }[] = [
  { href: "/documents", label: es.documents.title, tint: "purple", Icon: FileIcon },
  { href: "/contacts", label: es.contacts.title, tint: "orange", Icon: ContactsIcon },
  { href: "/expenses", label: es.expenses.title, tint: "yellow", Icon: WalletIcon },
];

export default async function HomePage() {
  const { user, household } = await requireActiveHousehold();
  const now = new Date();
  const canEdit = household.role !== "viewer";
  const [overview, stats, day, activity, equipment] = await Promise.all([
    homeOverview(household.id),
    homeStats(household.id),
    homeDay(household.id, now),
    recentActivity(household.id, now),
    equipmentOverview(household.id, now),
  ]);
  const { items, score, level, weekCount, hasOverdue, factors } = overview;
  const displayName = user.name?.trim() || user.email.split("@")[0];
  const quick: { href: string; label: string; tint: Tint; Icon: typeof BoxIcon }[] = [
    { href: "/lists?nuevo=1", label: es.quick.task, tint: "green", Icon: ListIcon },
    { href: "/expenses/new", label: es.quick.expense, tint: "yellow", Icon: WalletIcon },
    { href: "/boxes/new", label: es.quick.box, tint: "teal", Icon: BoxIcon },
    { href: "/appliances/new", label: es.quick.appliance, tint: "blue", Icon: WrenchIcon },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/more" aria-label={es.nav.settings} className="relative flex size-[52px] shrink-0 items-center justify-center">
          <Avatar seed={user.id} label={initialOf(user.name, user.email)} size={52} />
          <span aria-hidden className="absolute bottom-0 right-0 size-3.5 rounded-full border-[3px] border-[color:var(--bg-bottom)] bg-ok-bar" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm text-muted"><TodayLabel /> · {household.name}</p>
          <h1 className="truncate text-[28px] font-extrabold">{displayName}</h1>
        </div>
        <Link href="/search" aria-label={es.search.title} className="card flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
          <SearchIcon width={21} height={21} />
        </Link>
        <Link href="/reminders" aria-label={es.push.title} className="card relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
          <BellIcon width={22} height={22} />
          {hasOverdue && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-soon-bar ring-2 ring-card" />}
        </Link>
      </header>

      <InstallHint />

      <NextUpBanner open={day.open} canEdit={canEdit} />

      <SkyCard score={score} level={level} open={day.open} done={day.done} weekCount={weekCount} monthExpenses={stats.monthExpenses} canEdit={canEdit} />

      <HealthBreakdown factors={factors} />

      {canEdit && (
        <section className="space-y-3" aria-label={es.quick.title}>
          <h2 className="text-2xl font-bold">{es.quick.title}</h2>
          <ul className="grid grid-cols-4 gap-3">
            {quick.map(({ href, label, tint, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex flex-col items-center gap-2">
                  <span
                    aria-hidden
                    className="flex aspect-square w-full items-center justify-center rounded-[26px] border border-border"
                    style={{ background: `var(--tint-${tint})`, color: `var(--on-tint-${tint})` }}
                  >
                    <Icon width={32} height={32} />
                  </span>
                  <span className="text-[15px] font-semibold">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Más módulos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {modules.map(({ href, label, tint, Icon }) => (
          <Link key={href} href={href} className="card flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-4 text-sm font-extrabold">
            <IconTile tint={tint} size={32}><Icon width={18} height={18} /></IconTile>
            {label}
          </Link>
        ))}
      </nav>

      <StatTiles stats={stats} />

      <section className="space-y-3" aria-label={es.nav.appliances}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{es.nav.appliances}</h2>
          <Link href="/appliances" className="flex min-h-11 items-center text-[15px] font-bold text-link">{es.home.seeAppliances}</Link>
        </div>
        <div className="card flex items-center gap-5 border border-border p-5">
          <StatusRing
            ok={equipment.counts.ok}
            soon={equipment.counts.soon}
            late={equipment.counts.overdue}
            center={String(equipment.counts.ok)}
            caption={es.home.ofTotal(equipment.appliancesTotal)}
            label={es.home.ringLabel(equipment.counts.ok, equipment.appliancesTotal)}
          />
          <ul className="min-w-0 flex-1 space-y-3 text-[16px]">
            <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-ok-bar" /><span className="flex-1">{es.appliances.stat.ok}</span><b>{equipment.counts.ok}</b></li>
            <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-late-bar" /><span className="flex-1">{es.appliances.stat.overdue}</span><b>{equipment.counts.overdue}</b></li>
            <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-soon-bar" /><span className="flex-1">{es.appliances.stat.soon}</span><b>{equipment.counts.soon}</b></li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{es.upcoming.title}</h2>
          <Link href="/upcoming" className="flex min-h-11 items-center text-[15px] font-bold text-link">{es.upcoming.seeAll}</Link>
        </div>
        {items.length === 0 ? (
          <p className="card p-4 text-muted">{es.upcoming.empty}</p>
        ) : (
          <ul className="space-y-3">{items.map((i) => <UpcomingRow key={i.key} item={i} />)}</ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{es.activity.title}</h2>
          <Link href="/activity" className="flex min-h-11 items-center text-[15px] font-bold text-link">{es.activity.seeAll}</Link>
        </div>
        <Timeline upcoming={[]} past={splitTimeline(activity, now).past.slice(0, 5)} now={now} empty={es.activity.empty} showToday={false} />
      </section>
    </div>
  );
}
