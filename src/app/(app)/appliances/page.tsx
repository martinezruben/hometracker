import { EmptyState } from "@/components/EmptyState";
import { es } from "@/lib/i18n/es";

export default function AppliancesPage() {
  return <EmptyState title={es.appliances.title} text={es.appliances.empty} />;
}
