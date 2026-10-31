import { requireActiveHousehold } from "@/lib/auth/access";
import { listAppliances } from "@/lib/appliances/data";
import { listBoxes } from "@/lib/boxes/data";
import { applianceUrl, boxUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { LabelStudio } from "@/components/labels/LabelStudio";

export default async function LabelsPage() {
  const { household } = await requireActiveHousehold();
  const [boxes, appliances] = await Promise.all([listBoxes(household.id), listAppliances(household.id)]);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.labels.title}</h1>
      <LabelStudio
        groups={[
          { title: es.labels.boxes, items: boxes.map((b) => ({ id: b.id, title: b.name, subtitle: b.location ?? undefined, url: boxUrl(b.id) })) },
          {
            title: es.labels.appliances,
            items: appliances.map((a) => ({ id: a.id, title: a.name, subtitle: [a.brand, a.model].filter(Boolean).join(" · ") || undefined, url: applianceUrl(a.id) })),
          },
        ]}
      />
    </section>
  );
}
