import { QrScanner } from "@/components/QrScanner";
import { es } from "@/lib/i18n/es";

export default function ScanPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-[36px] font-extrabold leading-tight tracking-tight">{es.scan.title}</h1>
      <QrScanner />
    </section>
  );
}
