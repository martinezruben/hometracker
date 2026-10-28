import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listBoxes } from "@/lib/boxes/data";
import { es } from "@/lib/i18n/es";
import { BoxCard } from "@/components/BoxCard";
import { ChevronRightIcon, PlusIcon, ScanIcon, SearchIcon } from "@/components/icons";
import { PendingCreates } from "@/components/PendingCreates";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function BoxesPage({ searchParams }: { searchParams: Promise<{ q?: string; loc?: string }> }) {
  const { q, loc } = await searchParams;
  const { household } = await requireActiveHousehold();
  const all = await listBoxes(household.id, q);
  const locations = [...all.reduce((m, b) => m.set(b.location ?? "", (m.get(b.location ?? "") ?? 0) + 1), new Map<string, number>())]
    .filter(([name]) => name)
    .sort((a, b) => b[1] - a[1]);
  const boxes = loc ? all.filter((b) => b.location === loc) : all;
  const totalObjects = all.reduce((n, b) => n + b.objects, 0);
  const href = (l?: string) => `/boxes?${new URLSearchParams({ ...(q ? { q } : {}), ...(l ? { loc: l } : {}) }).toString()}`;

  return (
    <section className="space-y-4">
      <PageHeader
        title={es.boxes.title}
        subtitle={es.boxes.summary(all.length, totalObjects)}
        action={
          household.role !== "viewer" && (
            <Link href="/boxes/new" aria-label={es.boxes.new} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgb(29_78_216/0.35)]">
              <PlusIcon width={24} height={24} />
            </Link>
          )
        }
      />

      <form action="/boxes" method="get" role="search" className="card flex min-h-12 items-center gap-3 rounded-full px-4">
        <SearchIcon width={20} height={20} className="shrink-0 text-muted" />
        <input
          name="q"
          type="search"
          aria-label={es.boxes.searchPlaceholder}
          defaultValue={q}
          placeholder={es.boxes.searchPlaceholder}
          className="min-h-12 w-full bg-transparent text-base outline-none"
        />
      </form>

      <Link href="/scan" className="relative flex min-h-[88px] items-center gap-4 overflow-hidden rounded-3xl bg-brand p-4 text-white">
        <span aria-hidden className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20"><ScanIcon width={26} height={26} /></span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-lg font-extrabold">{es.boxes.scanTitle}</span>
          <span className="block text-sm text-white/85">{es.boxes.scanText}</span>
        </span>
        <ChevronRightIcon width={22} height={22} className="relative shrink-0" />
      </Link>

      {locations.length > 0 && (
        <nav aria-label="Ubicaciones" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip href={href()} active={!loc}>{es.boxes.allLocations}</Chip>
          {locations.map(([name, n]) => (
            <Chip key={name} href={href(name)} active={loc === name}>{name} · {n}</Chip>
          ))}
        </nav>
      )}

      <PendingCreates op="box-create" hint={es.sync.pendingBox} />
      {boxes.length === 0 ? (
        <p className="card p-4 text-muted">{q ? es.boxes.emptySearch : es.boxes.empty}</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3">
            {boxes.map((b) => (
              <li key={b.id}><BoxCard box={b} /></li>
            ))}
          </ul>
          <Link href="/boxes/labels" className="flex min-h-11 items-center text-sm font-bold text-link">{es.boxes.printAll}</Link>
        </>
      )}
    </section>
  );
}
