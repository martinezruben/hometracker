import { and, asc, desc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDateOnly } from "@/lib/maintenance/schedule";

const { tasks } = schema;
const DAY = 86_400_000;

/**
 * Pendientes con fecha cercana y lo completado en las últimas 36 h: lo que el dial de Inicio necesita.
 * La ventana es amplia a propósito: el "hoy" lo decide el dispositivo (zona horaria local).
 */
export async function homeDay(householdId: string, now = new Date()) {
  const [open, done] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, dueTime: tasks.dueTime, urgent: tasks.urgent })
      .from(tasks)
      .where(
        and(
          eq(tasks.householdId, householdId),
          isNull(tasks.deletedAt),
          isNull(tasks.doneAt),
          isNotNull(tasks.dueAt),
          gte(tasks.dueAt, new Date(now.getTime() - 30 * DAY)),
          lte(tasks.dueAt, new Date(now.getTime() + 2 * DAY)),
        ),
      )
      .orderBy(asc(tasks.dueAt))
      .limit(100),
    db
      .select({ id: tasks.id, title: tasks.title, doneAt: tasks.doneAt })
      .from(tasks)
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNotNull(tasks.doneAt), gte(tasks.doneAt, new Date(now.getTime() - 36 * 3_600_000))))
      .orderBy(desc(tasks.doneAt))
      .limit(50),
  ]);
  return {
    open: open.map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt ? formatDateOnly(t.dueAt) : null, dueTime: t.dueTime, urgent: t.urgent })),
    done: done.map((t) => ({ id: t.id, title: t.title, doneAt: t.doneAt!.toISOString() })),
  };
}
