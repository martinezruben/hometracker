import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getBoxAccess, getBoxContent } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { boxUrl } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { qrSvg } from "@/lib/qr";
import { BoxContent } from "@/components/BoxContent";
import { BoxIllustration } from "@/components/BoxIllustration";
import { CameraIcon, ChevronLeftIcon, MoreIcon, PinIcon, PrinterIcon } from "@/components/icons";
import { PhotoCarousel } from "@/components/PhotoCarousel";

const circle = "flex size-11 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_2px_8px_rgb(15_27_61/0.15)]";

function updatedLabel(d: Date, now = new Date()) {
  const days = Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86_400_000);
  return days <= 0 ? es.boxes.today : days === 1 ? es.boxes.yesterday : formatDate(d);
}

export default async function BoxPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getBoxAccess(user.id, parsed.data);
  if (!access) {
    return <p className="card p-4 text-muted">{es.boxes.noAccess}</p>;
  }
  const { box, role } = access;
  const content = await getBoxContent(box);
  const objects = content.items.reduce((n, i) => n + i.quantity, 0);
  const qr = await qrSvg(boxUrl(box.id));

  return (
    // La portada llega al borde de la pantalla: se cancelan los márgenes del contenedor.
    <div className="-mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] -mb-32">
      <div className="relative h-[300px] overflow-hidden" style={{ background: `linear-gradient(180deg, var(--tint-${box.color}), var(--bg-bottom))` }}>
        {content.photos.length > 0 ? (
          <PhotoCarousel photoIds={content.photos.map((p) => p.id)} />
        ) : (
          <BoxIllustration className="absolute inset-x-0 top-12 mx-auto w-[62%] max-w-[260px]" />
        )}
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between">
          <Link href="/boxes" aria-label={es.boxes.back} className={circle}><ChevronLeftIcon width={22} height={22} /></Link>
          <div className="flex gap-2">
            {role !== "viewer" && (
              <a href="#fotos" aria-label={es.boxes.camera} className={circle}><CameraIcon width={22} height={22} /></a>
            )}
            <a href="#acciones" aria-label={es.boxes.moreActions} className={circle}><MoreIcon width={22} height={22} /></a>
          </div>
        </div>
      </div>

      <div className="relative -mt-8 space-y-5 rounded-t-[28px] bg-card px-5 pb-40 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-wider text-link">{es.boxes.boxNumber(box.number)}</p>
            <h1 className="text-[32px] font-extrabold leading-tight">{box.name}</h1>
            {box.location && (
              <p className="mt-1 flex items-center gap-1.5 text-muted"><PinIcon width={16} height={16} /> {box.location}</p>
            )}
            {box.notes && <p className="mt-2 whitespace-pre-line text-sm">{box.notes}</p>}
          </div>
          <Link href={`/b/${box.id}/label`} aria-label={es.boxes.qrLabel} className="size-[72px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-1.5">
            <span className="block size-full text-black [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </Link>
        </div>

        <dl className="grid grid-cols-3 gap-2.5">
          {[
            [String(objects), es.boxes.objectsLabel],
            [String(content.photos.length), es.boxes.photosLabel],
            [updatedLabel(box.updatedAt), es.boxes.updatedLabel],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-tile p-3">
              <dt className="sr-only">{label}</dt>
              <dd className="text-xl font-extrabold">{value}</dd>
              <p className="text-xs text-muted" aria-hidden>{label}</p>
            </div>
          ))}
        </dl>

        <Link href={`/b/${box.id}/label`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand font-extrabold text-white shadow-[0_8px_20px_rgb(29_78_216/0.3)]">
          <PrinterIcon width={22} height={22} /> {es.boxes.printLabel}
        </Link>

        <BoxContent
          box={{ id: box.id, name: box.name, location: box.location, notes: box.notes, color: box.color }}
          items={content.items.map((i) => ({ id: i.id, title: i.title, quantity: i.quantity, category: i.category, notes: i.notes }))}
          photos={content.photos.map((p) => ({ id: p.id }))}
          canEdit={role !== "viewer"}
        />
      </div>
    </div>
  );
}
