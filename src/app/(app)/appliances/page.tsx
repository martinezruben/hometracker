import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listAppliances } from "@/lib/appliances/data";
import { es } from "@/lib/i18n/es";
import { DueBadge } from "@/components/DueBadge";
import { PendingCreates } from "@/components/PendingCreates";
import { SearchForm } from "@/components/SearchForm";

export default async function AppliancesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { household } = await requireActiveHousehold();
  const list = await listAppliances(household.id, q);
  const now = new Date();

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{es.appliances.title}</h1>
        {household.role !== "viewer" && (
          <Link href="/appliances/new" className="min-h-11 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">
            {es.appliances.new}
          </Link>
        )}
      </header>
      <SearchForm q={q} placeholder={es.appliances.searchPlaceholder} />
      <PendingCreates op="appliance-create" hint={es.appliances.pendingAppliance} />
      {list.length === 0 ? (
        <p className="card p-4 text-muted">
          {q ? es.appliances.emptySearch : es.appliances.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/appliances/${a.id}`} className="flex min-h-16 items-center justify-between gap-3 card p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="truncate text-sm text-muted">{[a.brand, a.model, a.location].filter(Boolean).join(" · ")}</p>
                </div>
                {a.nextDue && <DueBadge nextDue={a.nextDue} now={now} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
