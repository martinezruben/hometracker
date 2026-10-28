import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listContacts } from "@/lib/contacts/data";
import { cleanPhone } from "@/lib/contacts/schemas";
import { es } from "@/lib/i18n/es";
import { PendingCreates } from "@/components/PendingCreates";
import { SearchForm } from "@/components/SearchForm";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { household } = await requireActiveHousehold();
  const contacts = await listContacts(household.id, q);
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{es.contacts.title}</h1>
        {household.role !== "viewer" && (
          <Link href="/contacts/new" className="min-h-11 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white dark:text-slate-900">
            {es.contacts.new}
          </Link>
        )}
      </header>
      <SearchForm q={q} placeholder={es.contacts.searchPlaceholder} />
      <PendingCreates op="contact-create" hint={es.contacts.pending} />
      {contacts.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{q ? es.contacts.emptySearch : es.contacts.empty}</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-card">
              <Link href={`/contacts/${c.id}`} className="flex min-h-16 min-w-0 flex-1 flex-col justify-center p-4">
                <span className="truncate font-semibold">{c.name}</span>
                <span className="truncate text-sm text-muted">
                  {[c.category, c.rating ? "★".repeat(c.rating) : null].filter(Boolean).join(" · ")}
                </span>
              </Link>
              {c.phone && (
                <a href={`tel:${cleanPhone(c.phone)}`} aria-label={`${es.contacts.call} ${c.name}`} className="flex size-12 shrink-0 items-center justify-center text-xl">
                  📞
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
