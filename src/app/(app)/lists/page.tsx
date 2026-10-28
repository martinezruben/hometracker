import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listLists } from "@/lib/lists/data";
import { es } from "@/lib/i18n/es";
import { NewListForm } from "@/components/NewListForm";
import { PendingCreates } from "@/components/PendingCreates";

export default async function ListsPage() {
  const { household } = await requireActiveHousehold();
  const lists = await listLists(household.id);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.lists.title}</h1>
      {household.role !== "viewer" && <NewListForm />}
      <PendingCreates op="list-create" hint={es.lists.pendingList} />
      {lists.length === 0 ? (
        <p className="card p-4 text-muted">{es.lists.empty}</p>
      ) : (
        <ul className="space-y-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/lists/${l.id}`} className="flex min-h-16 items-center justify-between gap-3 card p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-sm text-muted">{es.lists.types[l.type]}</p>
                </div>
                <span className="shrink-0 text-sm text-muted">{es.lists.open(l.open)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
