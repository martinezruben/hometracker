import { requireActiveHousehold } from "@/lib/auth/access";
import { listBoxes } from "@/lib/boxes/data";
import { boxUrl } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/PrintButton";

export default async function LabelsPage() {
  const { household } = await requireActiveHousehold();
  const boxes = await listBoxes(household.id);
  const labels = await Promise.all(boxes.map(async (b) => ({ b, svg: await qrSvg(boxUrl(b.id)) })));
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold print:hidden">{es.boxes.labelsTitle}</h1>
      <PrintButton />
      <ul className="grid grid-cols-2 gap-4 print:grid-cols-3 print:gap-3">
        {labels.map(({ b, svg }) => (
          <li key={b.id} className="break-inside-avoid rounded-lg border border-border p-3 text-center bg-white text-black print:border-black">
            <div className="mx-auto aspect-square w-full max-w-40 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-2 font-semibold">{b.name}</p>
            {b.location && <p className="text-xs">{b.location}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
