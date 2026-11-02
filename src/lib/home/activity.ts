import { and, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import type { KindGroup, TimelineEvent } from "@/lib/timeline";

const { maintenanceLogs, appliances, tasks, expenses, users, boxItems, boxes } = schema;

const none = Promise.resolve([] as never[]);

/** Lo último que pasó en el hogar (mantenimientos hechos, pendientes completados y gastos), del más reciente al más antiguo. */
export async function recentActivity(householdId: string, now = new Date(), limit = 8, only?: KindGroup): Promise<TimelineEvent[]> {
  const want = (g: KindGroup) => !only || only === g;
  const [logs, done, spent, items] = await Promise.all([
    want("maintenance")
      ? db
          .select({ id: maintenanceLogs.id, at: maintenanceLogs.doneAt, cost: maintenanceLogs.cost, applianceId: appliances.id, appliance: appliances.name })
          .from(maintenanceLogs)
          .innerJoin(appliances, eq(appliances.id, maintenanceLogs.applianceId))
          .where(and(eq(maintenanceLogs.householdId, householdId), isNull(maintenanceLogs.deletedAt), lte(maintenanceLogs.doneAt, now)))
          .orderBy(desc(maintenanceLogs.doneAt))
          .limit(limit)
      : none,
    want("task")
      ? db
          .select({ id: tasks.id, title: tasks.title, at: tasks.doneAt, who: users.name, email: users.email })
          .from(tasks)
          .leftJoin(users, eq(users.id, tasks.doneBy))
          .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNotNull(tasks.doneAt), lte(tasks.doneAt, now)))
          .orderBy(desc(tasks.doneAt))
          .limit(limit)
      : none,
    want("expense")
      ? db
          .select({ id: expenses.id, title: expenses.title, amount: expenses.amount, at: expenses.spentAt })
          .from(expenses)
          .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), lte(expenses.spentAt, now)))
          .orderBy(desc(expenses.spentAt))
          .limit(limit)
      : none,
    want("box")
      ? db
          .select({ id: boxItems.id, title: boxItems.title, quantity: boxItems.quantity, category: boxItems.category, at: boxItems.createdAt, boxId: boxes.id, number: boxes.number })
          .from(boxItems)
          .innerJoin(boxes, eq(boxes.id, boxItems.boxId))
          .where(and(eq(boxItems.householdId, householdId), isNull(boxItems.deletedAt), isNull(boxes.deletedAt), lte(boxItems.createdAt, now)))
          .orderBy(desc(boxItems.createdAt))
          .limit(limit)
      : none,
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
    ...items.map((i) => ({
      id: `i-${i.id}`,
      at: i.at,
      kind: "item" as const,
      tone: "ok" as const,
      title: es.activity.itemAdded(i.title, i.quantity),
      detail: [es.boxes.boxNumber(i.number), i.category].filter(Boolean).join(" · "),
      href: `/b/${i.boxId}`,
    })),
  ];
  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
