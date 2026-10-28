import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getBoxAccess } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { boxUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/PrintButton";

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getBoxAccess(user.id, parsed.data);
  if (!access) notFound();
  const { box } = access;
  const svg = await qrSvg(boxUrl(box.id));
  return (
    <section className="mx-auto max-w-sm space-y-4 text-center">
      <div className="rounded-xl border border-border p-6 bg-white text-black print:border-2 print:border-black">
        <div className="mx-auto aspect-square w-full max-w-64 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 text-xl font-bold">{box.name}</p>
        {box.location && <p className="text-sm">{box.location}</p>}
        <p className="mt-2 text-xs">{es.boxes.scanHint}</p>
      </div>
      <PrintButton />
    </section>
  );
}
