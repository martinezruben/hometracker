import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getListAccess, getListContent } from "@/lib/lists/data";
import { uuid } from "@/lib/lists/schemas";
import { es } from "@/lib/i18n/es";
import { ListDetail } from "@/components/ListDetail";
import { linkBtnCls } from "@/components/ui";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getListAccess(user.id, parsed.data);
  if (!access) return <p className="card p-4 text-muted">{es.lists.noAccess}</p>;
  const { list, role } = access;
  const items = await getListContent(list);
  return (
    <section className="space-y-4">
      <Link href="/lists" className={linkBtnCls}>← {es.lists.back}</Link>
      <header>
        <h1 className="text-2xl font-bold">{list.name}</h1>
        <p className="text-muted">{es.lists.types[list.type]}</p>
      </header>
      <ListDetail
        list={{ id: list.id, name: list.name, type: list.type }}
        canEdit={role !== "viewer"}
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          quantity: i.quantity,
          price: i.price,
          status: i.status,
          checked: i.checked,
          notes: i.notes,
          photos: i.photos,
        }))}
      />
    </section>
  );
}
