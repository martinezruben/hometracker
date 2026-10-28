import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getApplianceAccess } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { applianceUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/PrintButton";

export default async function ApplianceLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getApplianceAccess(user.id, parsed.data);
  if (!access) notFound();
  const { appliance: a } = access;
  const svg = await qrSvg(applianceUrl(a.id));
  return (
    <section className="mx-auto max-w-sm space-y-4 text-center">
      <div className="rounded-xl border border-border bg-white p-6 text-black print:border-2 print:border-black">
        <div className="mx-auto aspect-square w-full max-w-64 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 text-xl font-bold">{a.name}</p>
        {(a.brand || a.model) && <p className="text-sm">{[a.brand, a.model].filter(Boolean).join(" · ")}</p>}
        <p className="mt-2 text-xs">{es.appliances.scanHint}</p>
      </div>
      <PrintButton />
    </section>
  );
}
