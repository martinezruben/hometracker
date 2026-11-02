import Link from "next/link";
import { equipmentOverview } from "@/lib/appliances/overview";
import { recentActivity } from "@/lib/home/activity";
import { splitTimeline } from "@/lib/timeline";
import { es } from "@/lib/i18n/es";
import { StatusRing } from "@/components/ui/StatusRing";
import { Timeline } from "@/components/ui/Timeline";

/** Marcador de posición mientras llega una sección (Inicio la muestra por partes para abrir antes). */
export function SectionSkeleton({ className = "h-40" }: { className?: string }) {
  return <div role="status" aria-busy="true" aria-label={es.loading} className={`card animate-pulse ${className}`} />;
}

/** Anillo de equipos al día. Se consulta aparte para no retrasar lo de arriba de Inicio. */
export async function EquipmentSection({ householdId, now }: { householdId: string; now: Date }) {
  const equipment = await equipmentOverview(householdId, now);
  return (
    <section className="space-y-3" aria-label={es.nav.appliances}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{es.nav.appliances}</h2>
        <Link href="/appliances" className="flex min-h-11 items-center text-[15px] font-bold text-link">{es.home.seeAppliances}</Link>
      </div>
      <div className="card flex items-center gap-5 p-5">
        <StatusRing
          ok={equipment.counts.ok}
          soon={equipment.counts.soon}
          late={equipment.counts.overdue}
          center={String(equipment.counts.ok)}
          caption={es.home.ofTotal(equipment.appliancesTotal)}
          label={es.home.ringLabel(equipment.counts.ok, equipment.appliancesTotal)}
        />
        <ul className="min-w-0 flex-1 space-y-3 text-[16px]">
          <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-ok-bar" /><span className="flex-1">{es.appliances.stat.ok}</span><b>{equipment.counts.ok}</b></li>
          <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-late-bar" /><span className="flex-1">{es.appliances.stat.overdue}</span><b>{equipment.counts.overdue}</b></li>
          <li className="flex items-center gap-2.5"><span className="size-3 rounded-full bg-soon-bar" /><span className="flex-1">{es.appliances.stat.soon}</span><b>{equipment.counts.soon}</b></li>
        </ul>
      </div>
    </section>
  );
}

/** Últimos movimientos del hogar (cuatro consultas), también por separado. */
export async function ActivitySection({ householdId, now }: { householdId: string; now: Date }) {
  const activity = await recentActivity(householdId, now);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{es.activity.title}</h2>
        <Link href="/activity" className="flex min-h-11 items-center text-[15px] font-bold text-link">{es.activity.seeAll}</Link>
      </div>
      <Timeline upcoming={[]} past={splitTimeline(activity, now).past.slice(0, 5)} now={now} empty={es.activity.empty} showToday={false} />
    </section>
  );
}
