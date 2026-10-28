import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listBoxes } from "@/lib/boxes/data";
import { es } from "@/lib/i18n/es";
import { SearchForm } from "@/components/SearchForm";
import { PendingBoxes } from "@/components/PendingBoxes";
import { linkBtnCls } from "@/components/ui";

export default async function BoxesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { household } = await requireActiveHousehold();
  const boxes = await listBoxes(household.id, q);
  const canCreate = household.role !== "viewer";

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{es.boxes.title}</h1>
        {canCreate && (
          <Link href="/boxes/new" className="min-h-11 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white dark:text-slate-900">
            {es.boxes.new}
          </Link>
        )}
      </header>
      <SearchForm q={q} placeholder={es.boxes.searchPlaceholder} />
      <Link href="/scan" className="flex min-h-12 items-center justify-center rounded-xl border border-primary font-semibold text-primary">
        📷 {es.scan.open}
      </Link>
      <PendingBoxes />
      {boxes.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">
          {q ? es.boxes.emptySearch : es.boxes.empty}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {boxes.map((b) => (
              <li key={b.id}>
                <Link href={`/b/${b.id}`} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-border">
                    {b.coverPhotoId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${b.coverPhotoId}?thumb=1`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.name}</p>
                    {b.location && <p className="truncate text-sm text-muted">{b.location}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/boxes/labels" className={linkBtnCls}>{es.boxes.printAll}</Link>
        </>
      )}
    </section>
  );
}
