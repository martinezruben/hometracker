import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addInterval, formatDateOnly, type IntervalUnit } from "@/lib/maintenance/schedule";

const { tasks, taskSteps, householdMembers, users } = schema;

export async function getTaskAccess(userId: string, id: string) {
  const [row] = await db
    .select({ task: tasks, role: householdMembers.role })
    .from(tasks)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, tasks.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
  return row ?? null;
}

export async function isMember(householdId: string, userId: string) {
  const [row] = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
  return !!row;
}

export async function listMembers(householdId: string) {
  return db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.createdAt));
}

export async function createTask(
  householdId: string,
  userId: string,
  input: Omit<typeof tasks.$inferInsert, "householdId" | "createdBy" | "id"> & { id?: string },
) {
  if (input.assignedTo && !(await isMember(householdId, input.assignedTo))) return null;
  const id = input.id ?? randomUUID();
  await db
    .insert(tasks)
    .values({ ...input, id, householdId, createdBy: userId })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return row.householdId === householdId ? row : null;
}

export type TaskWithSteps = typeof tasks.$inferSelect & { stepsTotal: number; stepsDone: number };

async function withStepCounts(householdId: string, rows: (typeof tasks.$inferSelect)[]): Promise<TaskWithSteps[]> {
  if (!rows.length) return [];
  const counts = await db
    .select({ taskId: taskSteps.taskId, total: sql<number>`count(*)`, done: sql<number>`sum(${taskSteps.done})` })
    .from(taskSteps)
    .where(and(eq(taskSteps.householdId, householdId), isNull(taskSteps.deletedAt), inArray(taskSteps.taskId, rows.map((r) => r.id))))
    .groupBy(taskSteps.taskId);
  const byTask = new Map(counts.map((c) => [c.taskId, { total: Number(c.total), done: Number(c.done ?? 0) }]));
  return rows.map((r) => ({ ...r, stepsTotal: byTask.get(r.id)?.total ?? 0, stepsDone: byTask.get(r.id)?.done ?? 0 }));
}

/** Pendientes abiertos (con fecha primero, por vencimiento) y los últimos completados. */
export async function listTasks(householdId: string, doneLimit = 100) {
  const [open, done] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.doneAt)))
      .orderBy(sql`${tasks.dueAt} is null`, asc(tasks.dueAt), asc(tasks.createdAt)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNotNull(tasks.doneAt)))
      .orderBy(desc(tasks.doneAt))
      .limit(doneLimit),
  ]);
  const [openRows, doneRows] = await Promise.all([withStepCounts(householdId, open), withStepCounts(householdId, done)]);
  return { open: openRows, done: doneRows };
}

export async function getStepAccess(userId: string, stepId: string) {
  const [row] = await db
    .select({ step: taskSteps, role: householdMembers.role })
    .from(taskSteps)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, taskSteps.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(taskSteps.id, stepId), isNull(taskSteps.deletedAt)));
  return row ?? null;
}

export async function listSteps(householdId: string, taskId: string) {
  return db
    .select()
    .from(taskSteps)
    .where(and(eq(taskSteps.householdId, householdId), eq(taskSteps.taskId, taskId), isNull(taskSteps.deletedAt)))
    .orderBy(asc(taskSteps.createdAt));
}

export async function createStep(task: typeof tasks.$inferSelect, userId: string, input: { id?: string; title: string }) {
  const id = input.id ?? randomUUID();
  await db
    .insert(taskSteps)
    .values({ id, householdId: task.householdId, taskId: task.id, createdBy: userId, title: input.title })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(taskSteps).where(eq(taskSteps.id, id));
  return row.taskId === task.id && row.householdId === task.householdId ? row : null;
}

export async function upcomingTasks(householdId: string, limit = 5) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.doneAt)))
    .orderBy(sql`${tasks.dueAt} is null`, asc(tasks.dueAt), asc(tasks.createdAt))
    .limit(limit);
}

export function parseRepeat(rule: string | null): { value: number; unit: IntervalUnit } | null {
  const m = rule?.match(/^(\d+):(day|week|month|year)$/);
  return m ? { value: Number(m[1]), unit: m[2] as IntervalUnit } : null;
}

/**
 * Completa un pendiente. Sin repetición queda hecho; con repetición se reprograma
 * desde hoy. Idempotente: si `seenDue` ya no coincide con el vencimiento actual,
 * otro envío (o un reintento offline) ya lo reprogramó y no se mueve de nuevo.
 */
export async function completeTask(
  task: typeof tasks.$inferSelect,
  now: Date,
  seenDue?: string | null,
  userId?: string | null,
): Promise<{ done: boolean; nextDue: Date | null; repeated: boolean }> {
  const repeat = parseRepeat(task.repeatRule);
  if (!repeat) {
    if (task.doneAt) return { done: true, nextDue: null, repeated: true };
    const [res] = await db
      .update(tasks)
      .set({ doneAt: now, doneBy: userId ?? null })
      .where(and(eq(tasks.id, task.id), isNull(tasks.doneAt)));
    return { done: true, nextDue: null, repeated: res.affectedRows !== 1 };
  }
  const current = task.dueAt ? formatDateOnly(task.dueAt) : null;
  if (seenDue !== undefined && seenDue !== current) {
    return { done: false, nextDue: task.dueAt, repeated: true };
  }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nextDue = addInterval(today, repeat.value, repeat.unit);
  // Condición sobre el vencimiento anterior: solo una de dos ejecuciones simultáneas gana.
  const [res] = await db
    .update(tasks)
    .set({ dueAt: nextDue })
    .where(and(eq(tasks.id, task.id), task.dueAt ? eq(tasks.dueAt, task.dueAt) : isNull(tasks.dueAt)));
  return { done: false, nextDue, repeated: res.affectedRows !== 1 };
}
