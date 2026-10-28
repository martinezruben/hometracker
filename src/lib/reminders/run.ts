import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sha256 } from "@/lib/auth/crypto";
import { formatDate } from "@/lib/format";
import { reminderFireAt } from "@/lib/maintenance/schedule";
import type { PushSender } from "@/lib/push/send";

const { maintenancePlans, appliances, householdMembers, pushSubscriptions, reminders, tasks, documents } = schema;

const DOC_REMIND_DAYS = 30;

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // no avisar de recordatorios de hace más de 30 días

/** Inserta el recordatorio; el índice único (usuario, tipo, entidad, momento) evita duplicados. */
async function insertIfNew(values: typeof reminders.$inferInsert) {
  try {
    await db.insert(reminders).values(values);
    return true;
  } catch (err) {
    const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === "ER_DUP_ENTRY") return false;
    throw err;
  }
}

export type RunResult = { created: number; sent: number; removed: number; retried: number };

/**
 * Crea los recordatorios que ya tocan y envía los pendientes. Seguro de ejecutar varias veces:
 * cada (usuario, plan, momento) se crea una sola vez y se envía como máximo una vez.
 *  - "maintenance": `remind_days_before` días antes del vencimiento.
 *  - "maintenance_due": el día del vencimiento (si es distinto del anterior).
 */
export async function runReminders(send: PushSender, now = new Date()): Promise<RunResult> {
  const result: RunResult = { created: 0, sent: 0, removed: 0, retried: 0 };

  // 1) Planes cuyo aviso ya toca (calculado en SQL para no cargar todos los planes).
  const plans = await db
    .select({
      id: maintenancePlans.id,
      householdId: maintenancePlans.householdId,
      title: maintenancePlans.title,
      nextDue: maintenancePlans.nextDue,
      remindDaysBefore: maintenancePlans.remindDaysBefore,
      assignedTo: maintenancePlans.assignedTo,
      applianceId: maintenancePlans.applianceId,
      applianceName: appliances.name,
    })
    .from(maintenancePlans)
    .innerJoin(appliances, eq(appliances.id, maintenancePlans.applianceId))
    .where(
      and(
        eq(maintenancePlans.active, true),
        isNull(maintenancePlans.deletedAt),
        isNull(appliances.deletedAt),
        lte(sql`DATE_SUB(${maintenancePlans.nextDue}, INTERVAL ${maintenancePlans.remindDaysBefore} DAY)`, now),
        gte(maintenancePlans.nextDue, new Date(now.getTime() - MAX_AGE_MS)),
      ),
    );

  for (const plan of plans) {
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, plan.householdId));
    const recipients = plan.assignedTo
      ? members.filter((m) => m.userId === plan.assignedTo)
      : members;
    if (!recipients.length) continue;

    const url = `/appliances/${plan.applianceId}`;
    const due = formatDate(plan.nextDue);
    const kinds = [
      {
        type: "maintenance",
        fireAt: reminderFireAt(plan.nextDue, plan.remindDaysBefore),
        title: `Mantenimiento próximo: ${plan.title}`,
        body: `${plan.applianceName} · vence el ${due}`,
      },
      ...(plan.remindDaysBefore > 0 && plan.nextDue <= now
        ? [
            {
              type: "maintenance_due",
              fireAt: plan.nextDue,
              title: `Hoy toca: ${plan.title}`,
              body: `${plan.applianceName} · venció el ${due}`,
            },
          ]
        : []),
    ].filter((k) => k.fireAt <= now);

    for (const k of kinds) {
      for (const r of recipients) {
        const inserted = await insertIfNew({
          id: randomUUID(),
          householdId: plan.householdId,
          userId: r.userId,
          entityType: k.type,
          entityId: plan.id,
          title: k.title,
          body: k.body,
          url,
          fireAt: k.fireAt,
        });
        if (inserted) result.created++;
      }
    }
  }

  // 1b) Pendientes con fecha que ya vencieron o vencen hoy (un aviso por tarea y fecha).
  const dueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        isNull(tasks.doneAt),
        lte(tasks.dueAt, now),
        gte(tasks.dueAt, new Date(now.getTime() - MAX_AGE_MS)),
      ),
    );
  for (const task of dueTasks) {
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, task.householdId));
    const recipients = task.assignedTo ? members.filter((m) => m.userId === task.assignedTo) : members;
    for (const r of recipients) {
      const inserted = await insertIfNew({
        id: randomUUID(),
        householdId: task.householdId,
        userId: r.userId,
        entityType: "task_due",
        entityId: task.id,
        title: `Pendiente: ${task.title}`,
        body: `Vence el ${formatDate(task.dueAt!)}`,
        url: "/tasks",
        fireAt: task.dueAt!,
      });
      if (inserted) result.created++;
    }
  }

  // 1c) Documentos (contratos, garantías…) que vencen en los próximos 30 días.
  const expiring = await db
    .select()
    .from(documents)
    .where(
      and(
        isNull(documents.deletedAt),
        lte(sql`DATE_SUB(${documents.expiresAt}, INTERVAL ${DOC_REMIND_DAYS} DAY)`, now),
        gte(documents.expiresAt, new Date(now.getTime() - MAX_AGE_MS)),
      ),
    );
  for (const doc of expiring) {
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, doc.householdId));
    for (const r of members) {
      const inserted = await insertIfNew({
        id: randomUUID(),
        householdId: doc.householdId,
        userId: r.userId,
        entityType: "document_expiring",
        entityId: doc.id,
        title: `Vence pronto: ${doc.title}`,
        body: `Vence el ${formatDate(doc.expiresAt!)}`,
        url: `/documents/${doc.id}`,
        fireAt: reminderFireAt(doc.expiresAt!, DOC_REMIND_DAYS),
      });
      if (inserted) result.created++;
    }
  }

  // 2) Enviar los pendientes (se reclama cada uno para enviarlo como máximo una vez).
  const pending = await db
    .select()
    .from(reminders)
    .where(and(isNull(reminders.sentAt), lte(reminders.fireAt, now), gte(reminders.fireAt, new Date(now.getTime() - MAX_AGE_MS))));

  for (const rem of pending) {
    const [claim] = await db
      .update(reminders)
      .set({ sentAt: now })
      .where(and(eq(reminders.id, rem.id), isNull(reminders.sentAt)));
    if (claim.affectedRows !== 1) continue; // otra ejecución lo tomó

    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, rem.userId));
    let delivered = 0;
    let transient = 0;
    const gone: string[] = [];
    for (const s of subs) {
      const res = await send(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title: rem.title, body: rem.body ?? undefined, url: rem.url ?? undefined },
      );
      if (res === "sent") delivered++;
      else if (res === "gone") gone.push(s.id);
      else transient++;
    }
    if (gone.length) {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
      result.removed += gone.length;
    }
    if (delivered === 0 && transient > 0) {
      // Todo falló por motivos transitorios: liberar para reintentar en la próxima ejecución.
      await db.update(reminders).set({ sentAt: null }).where(eq(reminders.id, rem.id));
      result.retried++;
    } else {
      result.sent += delivered;
    }
  }
  return result;
}

export const endpointHash = (endpoint: string) => sha256(endpoint);
