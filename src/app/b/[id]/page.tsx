import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getBoxAccess, getBoxContent } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { es } from "@/lib/i18n/es";
import { BoxContent } from "@/components/BoxContent";
import { linkBtnCls } from "@/components/ui";

export default async function BoxPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getBoxAccess(user.id, parsed.data);
  if (!access) {
    return <p className="rounded-xl border border-border bg-card p-4 text-muted">{es.boxes.noAccess}</p>;
  }
  const { box, role } = access;
  const content = await getBoxContent(box);
  return (
    <section className="space-y-4">
      <Link href="/boxes" className={linkBtnCls}>← {es.boxes.back}</Link>
      <header>
        <h1 className="text-2xl font-bold">{box.name}</h1>
        {box.location && <p className="text-muted">{box.location}</p>}
        {box.notes && <p className="mt-2 whitespace-pre-line text-sm">{box.notes}</p>}
      </header>
      <BoxContent
        box={{ id: box.id, name: box.name, location: box.location, notes: box.notes }}
        items={content.items.map((i) => ({ id: i.id, title: i.title, notes: i.notes }))}
        photos={content.photos.map((p) => ({ id: p.id }))}
        canEdit={role !== "viewer"}
      />
      <Link href={`/b/${box.id}/label`} className={linkBtnCls}>{es.boxes.printLabel}</Link>
    </section>
  );
}
