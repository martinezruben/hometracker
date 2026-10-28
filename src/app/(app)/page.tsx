import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { homeOverview } from "@/lib/home/upcoming";
import { es } from "@/lib/i18n/es";
import { BellIcon, BoxIcon, ContactsIcon, FileIcon, FilterIcon, SearchIcon, WalletIcon, WrenchIcon } from "@/components/icons";
import { Greeting } from "@/components/home/Greeting";
import { HealthCard } from "@/components/home/HealthCard";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { InstallHint } from "@/components/InstallHint";
import { Avatar, initialOf } from "@/components/ui/Avatar";
import { IconTile, type Tint } from "@/components/ui/IconTile";

const quick: { href: string; label: string; tint: Tint; Icon: typeof BoxIcon }[] = [
  { href: "/boxes", label: es.nav.boxes, tint: "yellow", Icon: BoxIcon },
  { href: "/appliances", label: es.nav.appliances, tint: "blue", Icon: WrenchIcon },
  { href: "/documents", label: es.documents.title, tint: "purple", Icon: FileIcon },
  { href: "/contacts", label: es.contacts.title, tint: "orange", Icon: ContactsIcon },
  { href: "/expenses", label: es.expenses.title, tint: "green", Icon: WalletIcon },
];

export default async function HomePage() {
  const { user, household } = await requireActiveHousehold();
  const { items, score, level, weekCount, hasOverdue } = await homeOverview(household.id);
  const displayName = user.name?.trim() || user.email.split("@")[0];

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/more" aria-label={es.nav.settings} className="flex size-12 shrink-0 items-center justify-center">
          <Avatar seed={user.id} label={initialOf(user.name, user.email)} size={48} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm text-muted"><Greeting /></p>
          <h1 className="truncate text-2xl font-extrabold">{displayName}</h1>
        </div>
        <Link href="/more#recordatorios" aria-label={es.push.title} className="card relative flex size-11 shrink-0 items-center justify-center rounded-full">
          <BellIcon width={22} height={22} />
          {hasOverdue && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-late-bar ring-2 ring-card" />}
        </Link>
      </header>

      <div className="flex items-center gap-3">
        <Link href="/search" className="card flex min-h-12 flex-1 items-center gap-3 rounded-full px-4 text-muted">
          <SearchIcon width={20} height={20} />
          <span className="truncate">{es.search.homePlaceholder}</span>
        </Link>
        <Link href="/search" aria-label={es.search.title} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-dark text-card">
          <FilterIcon width={20} height={20} />
        </Link>
      </div>

      <InstallHint />

      <HealthCard householdName={household.name} score={score} level={level} weekCount={weekCount} />

      <nav aria-label="Accesos rápidos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {quick.map(({ href, label, tint, Icon }) => (
          <Link key={href} href={href} className="card flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-extrabold">
            <IconTile tint={tint} size={32}><Icon width={18} height={18} /></IconTile>
            {label}
          </Link>
        ))}
      </nav>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{es.upcoming.title}</h2>
          <Link href="/upcoming" className="flex min-h-11 items-center text-sm font-bold text-link">{es.upcoming.seeAll}</Link>
        </div>
        {items.length === 0 ? (
          <p className="card p-4 text-muted">{es.upcoming.empty}</p>
        ) : (
          <ul className="space-y-3">{items.map((i) => <UpcomingRow key={i.key} item={i} />)}</ul>
        )}
      </section>
    </div>
  );
}
