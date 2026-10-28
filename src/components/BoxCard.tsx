import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { BoxIllustration } from "@/components/BoxIllustration";

export type BoxCardData = {
  id: string;
  number: number;
  color: "blue" | "orange" | "green" | "purple";
  name: string;
  location: string | null;
  objects: number;
  coverPhotoId: string | null;
};

/** Tarjeta de caja: panel pastel con ilustración (o la primera foto), número, nombre, lugar y cantidad. */
export function BoxCard({ box }: { box: BoxCardData }) {
  return (
    <Link href={`/b/${box.id}`} className="card block overflow-hidden p-2">
      <div className="relative aspect-[1/0.95] overflow-hidden rounded-2xl" style={{ background: `var(--tint-${box.color})` }}>
        <span className="absolute left-2 top-2 z-10 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-extrabold">{es.boxes.number(box.number)}</span>
        {box.coverPhotoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${box.coverPhotoId}?thumb=1`} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <BoxIllustration className="absolute inset-0 m-auto w-[78%]" />
        )}
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <p className="truncate text-[17px] font-extrabold">{box.name}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted">{box.location ?? " "}</span>
          <span className="shrink-0 text-sm font-extrabold text-link" aria-label={`${box.objects} ${es.boxes.objectsLabel}`}>{box.objects}</span>
        </div>
      </div>
    </Link>
  );
}
