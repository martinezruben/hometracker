import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";
import type { Role } from "@/lib/auth/roles";
import { nextDueAfter } from "@/lib/maintenance/schedule";

const { appliances, maintenancePlans, maintenanceLogs, photos, householdMembers } = schema;

const member = (householdCol: AnyMySqlColumn, userId: string) =>
  and(eq(householdMembers.householdId, householdCol), eq(householdMembers.userId, userId));

export async function getApplianceAccess(userId: string, id: string) {
  const [row] = await db
    .select({ appliance: appliances, role: householdMembers.role })
    .from(appliances)
    .innerJoin(householdMembers, member(appliances.householdId, userId))
    .where(and(eq(appliances.id, id), isNull(appliances.deletedAt)));
  return row ?? null;
}

export async function getPlanAccess(userId: string, id: string) {
  const [row] = await db
    .select({ plan: maintenancePlans, role: householdMembers.role })
    .from(maintenancePlans)
    .innerJoin(householdMembers, member(maintenancePlans.householdId, userId))
    .where(and(eq(maintenancePlans.id, id), isNull(maintenancePlans.deletedAt)));
  return row ?? null;
}

export type ApplianceAccess = { appliance: typeof appliances.$inferSelect; role: Role };

export async function createAppliance(
  householdId: string,
  userId: string,
  input: Omit<typeof appliances.$inferInsert, "householdId" | "createdBy" | "id"> & { id?: string },
) {
  const id = input.id ?? randomUUID();
  await db
    .insert(appliances)
    .values({ ...input, id, householdId, createdBy: userId })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(appliances).where(eq(appliances.id, id));
  return row.householdId === householdId ? row : null;
}

/** Equipos con su próximo mantenimiento activo (el más cercano). */
export async function listAppliances(householdId: string, q?: string) {
  const term = q?.trim();
  const pattern = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;
  const rows = await db
    .select()
    .from(appliances)
    .where(
      and(
        eq(appliances.householdId, householdId),
        isNull(appliances.deletedAt),
        pattern
          ? or(
              like(appliances.name, pattern),
              like(appliances.brand, pattern),
              like(appliances.model, pattern),
              like(appliances.location, pattern),
            )
          : undefined,
      ),
    )
    .orderBy(asc(appliances.name));
  if (!rows.length) return [];

  const plans = await db
    .select()
    .from(maintenancePlans)
    .where(
      and(
        eq(maintenancePlans.householdId, householdId),
        eq(maintenancePlans.active, true),
        isNull(maintenancePlans.deletedAt),
        inArray(maintenancePlans.applianceId, rows.map((r) => r.id)),
      ),
    )
    .orderBy(asc(maintenancePlans.nextDue));
  const nextByAppliance = new Map<string, Date>();
  for (const p of plans) if (!nextByAppliance.has(p.applianceId)) nextByAppliance.set(p.applianceId, p.nextDue);
  return rows.map((a) => ({ ...a, nextDue: nextByAppliance.get(a.id) ?? null }));
}

export async function getApplianceContent(a: typeof appliances.$inferSelect) {
  const scope = (col: AnyMySqlColumn) => eq(col, a.householdId);
  const [plans, logs, pics] = await Promise.all([
    db
      .select()
      .from(maintenancePlans)
      .where(and(eq(maintenancePlans.applianceId, a.id), scope(maintenancePlans.householdId), isNull(maintenancePlans.deletedAt)))
      .orderBy(asc(maintenancePlans.nextDue)),
    db
      .select()
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.applianceId, a.id), scope(maintenanceLogs.householdId), isNull(maintenanceLogs.deletedAt)))
      .orderBy(desc(maintenanceLogs.doneAt))
      .limit(50),
    db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.entityType, "appliance"),
          eq(photos.entityId, a.id),
          eq(photos.householdId, a.householdId),
          isNull(photos.deletedAt),
        ),
      )
      .orderBy(asc(photos.createdAt)),
  ]);
  return { plans, logs, photos: pics };
}

/** Próximos mantenimientos del hogar (para el inicio). */
export async function upcomingMaintenance(householdId: string, limit = 5) {
  return db
    .select({
      planId: maintenancePlans.id,
      title: maintenancePlans.title,
      nextDue: maintenancePlans.nextDue,
      applianceId: appliances.id,
      applianceName: appliances.name,
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
    .orderBy(asc(maintenancePlans.nextDue))
    .limit(limit);
}

/**
 * Registra un mantenimiento hecho y reprograma el plan. Idempotente por `logId`:
 * un reintento (cola offline) no vuelve a mover el vencimiento.
 */
export async function completePlan(
  plan: typeof maintenancePlans.$inferSelect,
  userId: string,
  input: { id: string; doneAt?: Date; cost?: number | null; providerId?: string | null; notes?: string | null },
) {
  const doneAt = input.doneAt ?? new Date();
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, input.id));
    if (existing) return existing.planId === plan.id ? { log: existing, repeated: true } : null;

    await tx.insert(maintenanceLogs).values({
      id: input.id,
      householdId: plan.householdId,
      createdBy: userId,
      applianceId: plan.applianceId,
      planId: plan.id,
      doneAt,
      cost: input.cost ?? null,
      providerId: input.providerId ?? null,
      notes: input.notes ?? null,
    });
    await tx
      .update(maintenancePlans)
      .set({ nextDue: nextDueAfter(doneAt, plan.intervalValue, plan.intervalUnit) })
      .where(eq(maintenancePlans.id, plan.id));
    const [log] = await tx.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, input.id));
    return { log, repeated: false };
  });
}
