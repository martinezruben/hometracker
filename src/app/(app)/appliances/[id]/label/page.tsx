import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getApplianceAccess } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { applianceUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { LabelStudio } from "@/components/labels/LabelStudio";

export default async function ApplianceLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getApplianceAccess(user.id, parsed.data);
  if (!access) notFound();
  const { appliance: a } = access;
  const subtitle = [a.brand, a.model].filter(Boolean).join(" · ") || undefined;
  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{es.labels.title}</h1>
      <LabelStudio groups={[{ items: [{ id: a.id, title: a.name, subtitle, badge: es.labels.applianceBadge, url: applianceUrl(a.id) }] }]} />
    </section>
  );
}
