import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function HomePage() {
  const { household } = await requireActiveHousehold();
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{es.home.title}</h1>
        <p className="text-muted">{household.name}</p>
      </header>
      <div>
        <h2 className="font-semibold">{es.home.nextMaintenance}</h2>
        <p className="mt-2 rounded-xl border border-border bg-card p-4 text-muted">
          {es.home.nextMaintenanceEmpty}
        </p>
      </div>
      <div>
        <h2 className="font-semibold">{es.home.recentBoxes}</h2>
        <p className="mt-2 rounded-xl border border-border bg-card p-4 text-muted">
          {es.home.recentBoxesEmpty}
        </p>
      </div>
    </section>
  );
}
