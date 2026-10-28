import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listDocuments } from "@/lib/documents/data";
import { DOCUMENT_KINDS } from "@/lib/documents/schemas";
import { formatDate, formatMoney } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { DueBadge } from "@/components/DueBadge";
import { PendingCreates } from "@/components/PendingCreates";
import { SearchForm } from "@/components/SearchForm";

const chip = (active: boolean) =>
  `min-h-11 shrink-0 rounded-full border px-4 py-2.5 text-sm ${active ? "border-dark bg-dark text-card" : "border-border bg-card"}`;

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { q, kind } = await searchParams;
  const activeKind = DOCUMENT_KINDS.find((k) => k === kind);
  const { household } = await requireActiveHousehold();
  const docs = await listDocuments(household.id, { kind: activeKind, q });
  const now = new Date();
  const qs = (k?: string) => (k ? `?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}` : q ? `?q=${encodeURIComponent(q)}` : "");
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{es.documents.title}</h1>
        {household.role !== "viewer" && (
          <Link href="/documents/new" className="min-h-11 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">
            {es.documents.new}
          </Link>
        )}
      </header>
      <SearchForm q={q} placeholder={es.documents.searchPlaceholder} />
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label={es.documents.kindLabel}>
        <Link href={`/documents${qs()}`} className={chip(!activeKind)}>{es.documents.all}</Link>
        {DOCUMENT_KINDS.map((k) => (
          <Link key={k} href={`/documents${qs(k)}`} className={chip(activeKind === k)}>{es.documents.kinds[k]}</Link>
        ))}
      </nav>
      <PendingCreates op="document-create" hint={es.documents.new} />
      {docs.length === 0 ? (
        <p className="card p-4 text-muted">{q || activeKind ? es.documents.emptySearch : es.documents.empty}</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/documents/${d.id}`} className="flex min-h-16 items-center justify-between gap-3 card p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.title}</p>
                  <p className="truncate text-sm text-muted">
                    {es.documents.kinds[d.kind]}
                    {d.amount != null && ` · ${formatMoney(d.amount)}`}
                    {d.expiresAt && ` · ${es.documents.expires(formatDate(d.expiresAt))}`}
                  </p>
                </div>
                {d.expiresAt && <DueBadge nextDue={d.expiresAt} now={now} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
