import { es } from "@/lib/i18n/es";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{es.home.title}</h1>
        <p className="text-muted">{es.home.welcome}</p>
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
