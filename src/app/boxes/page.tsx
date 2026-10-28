import { EmptyState } from "@/components/EmptyState";
import { es } from "@/lib/i18n/es";

export default function BoxesPage() {
  return <EmptyState title={es.boxes.title} text={es.boxes.empty} />;
}
