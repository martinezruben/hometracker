import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getBoxAccess } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { boxUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { LabelStudio } from "@/components/labels/LabelStudio";

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getBoxAccess(user.id, parsed.data);
  if (!access) notFound();
  const { box } = access;
  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{es.labels.title}</h1>
      <LabelStudio groups={[{ items: [{ id: box.id, title: box.name, subtitle: box.location ?? undefined, url: boxUrl(box.id) }] }]} />
    </section>
  );
}
