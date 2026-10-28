import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { globalSearch, type SearchResults } from "@/lib/search/data";
import { es } from "@/lib/i18n/es";

const t = es.search;
const sections: { key: keyof SearchResults; label: string }[] = [
  { key: "boxes", label: es.boxes.title },
  { key: "appliances", label: es.appliances.title },
  { key: "lists", label: es.lists.title },
  { key: "tasks", label: es.tasks.title },
  { key: "documents", label: es.documents.title },
  { key: "contacts", label: es.contacts.title },
  { key: "expenses", label: es.expenses.title },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { household } = await requireActiveHousehold();
  const results = await globalSearch(household.id, q);
  const total = Object.values(results).reduce((n, r) => n + r.length, 0);
  const searched = q.trim().length >= 2;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <form action="/search" method="get" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          autoFocus={!q}
          placeholder={t.placeholder}
          className="w-full min-h-12 rounded-2xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
        />
      </form>
      {!searched ? (
        <p className="text-muted">{t.hint}</p>
      ) : total === 0 ? (
        <p className="card p-4 text-muted">{t.none}</p>
      ) : (
        sections
          .filter((s) => results[s.key].length > 0)
          .map((s) => (
            <div key={s.key} className="space-y-2">
              <h2 className="font-semibold">{s.label}</h2>
              <ul className="divide-y divide-border card">
                {results[s.key].map((hit) => (
                  <li key={hit.id}>
                    <Link href={hit.href} className="flex min-h-14 flex-col justify-center p-4">
                      <span className="truncate">{hit.title}</span>
                      {hit.subtitle && <span className="truncate text-sm text-muted">{hit.subtitle}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
      )}
    </section>
  );
}
