import Link from "next/link";
import { es } from "@/lib/i18n/es";
import type { PlanCardData } from "@/lib/appliances/overview";
import { intervalLabel } from "@/lib/maintenance/progress";
import { WrenchIcon } from "@/components/icons";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { StatusBar, StatusPill } from "@/components/ui/Status";

const tints: Tint[] = ["blue", "green", "purple"];
const tintFor = (id: string): Tint => tints[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % tints.length];

const short = (d: Date) => d.toLocaleDateString("es", { timeZone: "UTC", day: "numeric", month: "short" }).replace(".", "");

/** Tarjeta de mantenimiento: equipo, "tarea · lugar", chip de fecha y barra con el intervalo. */
export function PlanCard({ plan }: { plan: PlanCardData }) {
  const chip = plan.status === "overdue" ? es.appliances.overdueChip : plan.days <= 6 && plan.days >= 0 ? `${es.calendarPage.weekdays[(plan.nextDue.getUTCDay() + 6) % 7]} ${plan.nextDue.getUTCDate()}` : short(plan.nextDue);
  return (
    <li>
      <Link href={`/appliances/${plan.applianceId}`} className="card block space-y-3 p-4">
        <div className="flex items-center gap-3">
          <IconTile tint={plan.status === "overdue" ? "red" : tintFor(plan.applianceId)} size={48}><WrenchIcon width={24} height={24} /></IconTile>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-extrabold">{plan.appliance}</p>
            <p className="truncate text-sm text-muted">{[plan.title, plan.location].filter(Boolean).join(" · ")}</p>
          </div>
          <StatusPill status={plan.status}>{chip}</StatusPill>
        </div>
        <div className="flex items-center gap-3">
          <StatusBar status={plan.status} progress={plan.progress} />
          <span className="shrink-0 text-xs text-muted">{intervalLabel(plan.intervalValue, plan.intervalUnit)}</span>
        </div>
      </Link>
    </li>
  );
}
