import { sql } from "drizzle-orm";
import { db } from "@/db";
import { currentMonth, monthRange } from "@/lib/expenses/month";

export type HomeStats = {
  boxes: number;
  objects: number;
  appliances: number;
  openTasks: number;
  monthExpenses: number;
};

/**
 * Cifras para el resumen de Inicio en UN solo viaje a la base (subconsultas escalares, todas filtradas por hogar).
 */
export async function homeStats(householdId: string, now = new Date()): Promise<HomeStats> {
  const { start, end } = monthRange(currentMonth(now));
  const [rows] = await db.execute(sql`
    select
      (select count(*) from boxes where household_id = ${householdId} and deleted_at is null) as boxes,
      (select coalesce(sum(i.quantity), 0) from box_items i join boxes b on b.id = i.box_id
         where b.household_id = ${householdId} and b.deleted_at is null and i.deleted_at is null) as objects,
      (select count(*) from appliances where household_id = ${householdId} and deleted_at is null) as appliances,
      (select count(*) from tasks where household_id = ${householdId} and deleted_at is null and done_at is null) as open_tasks,
      (select coalesce(sum(amount), 0) from expenses
         where household_id = ${householdId} and deleted_at is null and spent_at >= ${start} and spent_at < ${end}) as month_expenses
  `);
  const r = (rows as unknown as Record<string, string | number>[])[0];
  return {
    boxes: Number(r.boxes),
    objects: Number(r.objects),
    appliances: Number(r.appliances),
    openTasks: Number(r.open_tasks),
    monthExpenses: Number(r.month_expenses),
  };
}
