import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { daysUntil, dueStatus, type DueStatus, type IntervalUnit } from "@/lib/maintenance/schedule";
import { planProgress } from "@/lib/maintenance/progress";

const { maintenancePlans, appliances } = schema;

export type PlanCardData = {
  id: string;
  applianceId: string;
  appliance: string;
  location: string | null;
  title: string;
  nextDue: Date;
  status: DueStatus;
  days: number;
  progress: number;
  intervalValue: number;
  intervalUnit: IntervalUnit;
};

export type EquipmentOverview = {
  appliancesTotal: number;
  counts: Record<DueStatus, number>; // equipos según su peor mantenimiento (sin plan = al día)
  attention: number;
  plans: PlanCardData[];
};

const rank: Record<DueStatus, number> = { ok: 0, soon: 1, overdue: 2 };

/** Resumen de equipos y sus planes activos, del más urgente al más lejano. */
export async function equipmentOverview(householdId: string, now = new Date()): Promise<EquipmentOverview> {
  const [apps, rows] = await Promise.all([
    db.select({ id: appliances.id }).from(appliances).where(and(eq(appliances.householdId, householdId), isNull(appliances.deletedAt))),
    db
      .select({
        id: maintenancePlans.id,
        applianceId: appliances.id,
        appliance: appliances.name,
        location: appliances.location,
        title: maintenancePlans.title,
        nextDue: maintenancePlans.nextDue,
        intervalValue: maintenancePlans.intervalValue,
        intervalUnit: maintenancePlans.intervalUnit,
      })
      .from(maintenancePlans)
      .innerJoin(appliances, eq(appliances.id, maintenancePlans.applianceId))
      .where(
        and(
          eq(maintenancePlans.householdId, householdId),
          eq(maintenancePlans.active, true),
          isNull(maintenancePlans.deletedAt),
          isNull(appliances.deletedAt),
        ),
      )
      .orderBy(asc(maintenancePlans.nextDue)),
  ]);

  const plans: PlanCardData[] = rows.map((r) => ({
    ...r,
    status: dueStatus(r.nextDue, now),
    days: daysUntil(r.nextDue, now),
    progress: planProgress(r.nextDue, r.intervalValue, r.intervalUnit, now),
  }));

  const worst = new Map<string, DueStatus>();
  for (const p of plans) {
    const cur = worst.get(p.applianceId);
    if (!cur || rank[p.status] > rank[cur]) worst.set(p.applianceId, p.status);
  }
  const counts: Record<DueStatus, number> = { overdue: 0, soon: 0, ok: 0 };
  for (const a of apps) counts[worst.get(a.id) ?? "ok"]++;

  return { appliancesTotal: apps.length, counts, attention: counts.overdue + counts.soon, plans };
}
