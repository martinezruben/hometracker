import { requireActiveHousehold } from "@/lib/auth/access";
import { homeOverview } from "@/lib/home/upcoming";
import { es } from "@/lib/i18n/es";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function UpcomingPage() {
  const { household } = await requireActiveHousehold();
  const { items } = await homeOverview(household.id, new Date(), 100);
  return (
    <section className="space-y-4">
      <PageHeader title={es.upcoming.title} subtitle={items.length ? undefined : es.upcoming.empty} />
      {items.length > 0 && <ul className="space-y-3">{items.map((i) => <UpcomingRow key={i.key} item={i} />)}</ul>}
    </section>
  );
}
