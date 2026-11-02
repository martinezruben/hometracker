import { and, count, eq, gte, isNull, lt, sum } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentMonth, monthRange } from "@/lib/expenses/month";

export type HomeStats = {
  boxes: number;
  objects: number;
  appliances: number;
  openTasks: number;
  monthExpenses: number;
};

/** Cifras para el resumen de Inicio (consultas agregadas, todas filtradas por hogar). */
export async function homeStats(householdId: string, now = new Date()): Promise<HomeStats> {
  const { boxes, boxItems, appliances, tasks, expenses } = schema;
  const { start, end } = monthRange(currentMonth(now));
  const [[b], [o], [a], [t], [e]] = await Promise.all([
    db.select({ n: count() }).from(boxes).where(and(eq(boxes.householdId, householdId), isNull(boxes.deletedAt))),
    db
      .select({ n: sum(boxItems.quantity) })
      .from(boxItems)
      .innerJoin(boxes, eq(boxes.id, boxItems.boxId))
      .where(and(eq(boxes.householdId, householdId), isNull(boxes.deletedAt), isNull(boxItems.deletedAt))),
    db.select({ n: count() }).from(appliances).where(and(eq(appliances.householdId, householdId), isNull(appliances.deletedAt))),
    db.select({ n: count() }).from(tasks).where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.doneAt))),
    db
      .select({ n: sum(expenses.amount) })
      .from(expenses)
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), gte(expenses.spentAt, start), lt(expenses.spentAt, end))),
  ]);
  return { boxes: Number(b.n), objects: Number(o.n ?? 0), appliances: Number(a.n), openTasks: Number(t.n), monthExpenses: Number(e.n ?? 0) };
}
