import { and, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import type { TimelineEvent } from "@/lib/timeline";

const { maintenanceLogs, appliances, tasks, expenses, users } = schema;

/** Lo último que pasó en el hogar (mantenimientos hechos, pendientes completados y gastos), del más reciente al más antiguo. */
export async function recentActivity(householdId: string, now = new Date(), limit = 8): Promise<TimelineEvent[]> {
  const [logs, done, spent] = await Promise.all([
    db
      .select({ id: maintenanceLogs.id, at: maintenanceLogs.doneAt, cost: maintenanceLogs.cost, applianceId: appliances.id, appliance: appliances.name })
      .from(maintenanceLogs)
      .innerJoin(appliances, eq(appliances.id, maintenanceLogs.applianceId))
      .where(and(eq(maintenanceLogs.householdId, householdId), isNull(maintenanceLogs.deletedAt), lte(maintenanceLogs.doneAt, now)))
      .orderBy(desc(maintenanceLogs.doneAt))
      .limit(limit),
    db
      .select({ id: tasks.id, title: tasks.title, at: tasks.doneAt, who: users.name, email: users.email })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.doneBy))
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNotNull(tasks.doneAt), lte(tasks.doneAt, now)))
      .orderBy(desc(tasks.doneAt))
      .limit(limit),
    db
      .select({ id: expenses.id, title: expenses.title, amount: expenses.amount, at: expenses.spentAt })
      .from(expenses)
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), lte(expenses.spentAt, now)))
      .orderBy(desc(expenses.spentAt))
      .limit(limit),
  ]);

  const events: TimelineEvent[] = [
    ...logs.map((l) => ({
      id: `m-${l.id}`,
      at: l.at,
      kind: "done" as const,
      tone: "ok" as const,
      title: es.activity.maintenanceDone(l.appliance),
      detail: l.cost != null ? formatMoney(l.cost) : undefined,
      href: `/appliances/${l.applianceId}`,
    })),
    ...done.map((t) => ({
      id: `t-${t.id}`,
      at: t.at!,
      kind: "task" as const,
      tone: "ok" as const,
      title: es.activity.taskDone(t.title),
      detail: t.who ?? t.email?.split("@")[0] ?? undefined,
      href: "/lists",
    })),
    ...spent.map((e) => ({
      id: `e-${e.id}`,
      at: e.at,
      kind: "expense" as const,
      tone: "info" as const,
      title: e.title,
      detail: formatMoney(e.amount),
      href: `/expenses/${e.id}`,
    })),
  ];
  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
