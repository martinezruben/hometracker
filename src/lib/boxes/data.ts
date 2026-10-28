import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "@/lib/auth/roles";

const { boxes, boxItems, photos, householdMembers } = schema;

export type BoxAccess = { box: typeof boxes.$inferSelect; role: Role };

/**
 * Autorización en una sola consulta: la caja solo se devuelve si el usuario
 * es miembro de su hogar. Devuelve null si no existe, está borrada o no hay acceso.
 */
export async function getBoxAccess(userId: string, boxId: string): Promise<BoxAccess | null> {
  const [row] = await db
    .select({ box: boxes, role: householdMembers.role })
    .from(boxes)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, boxes.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)));
  return row ?? null;
}

export async function getItemAccess(userId: string, itemId: string) {
  const [row] = await db
    .select({ item: boxItems, role: householdMembers.role })
    .from(boxItems)
    .innerJoin(
      householdMembers,
      and(
        eq(householdMembers.householdId, boxItems.householdId),
        eq(householdMembers.userId, userId),
      ),
    )
    .where(and(eq(boxItems.id, itemId), isNull(boxItems.deletedAt)));
  return row ?? null;
}

export async function getPhotoAccess(userId: string, photoId: string) {
  const [row] = await db
    .select({ photo: photos, role: householdMembers.role })
    .from(photos)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, photos.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(photos.id, photoId), isNull(photos.deletedAt)));
  return row ?? null;
}

export async function listBoxes(householdId: string, q?: string) {
  const term = q?.trim();
  const pattern = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;

  let matchingIds: string[] | null = null;
  if (pattern) {
    const byItem = await db
      .selectDistinct({ id: boxItems.boxId })
      .from(boxItems)
      .where(
        and(
          eq(boxItems.householdId, householdId),
          isNull(boxItems.deletedAt),
          or(like(boxItems.title, pattern), like(boxItems.notes, pattern)),
        ),
      );
    matchingIds = byItem.map((r) => r.id);
  }

  const rows = await db
    .select()
    .from(boxes)
    .where(
      and(
        eq(boxes.householdId, householdId),
        isNull(boxes.deletedAt),
        pattern
          ? or(
              like(boxes.name, pattern),
              like(boxes.location, pattern),
              like(boxes.notes, pattern),
              matchingIds && matchingIds.length ? inArray(boxes.id, matchingIds) : undefined,
            )
          : undefined,
      ),
    )
    .orderBy(desc(boxes.createdAt));

  const covers = rows.length
    ? await db
        .select({ id: photos.id, entityId: photos.entityId })
        .from(photos)
        .where(
          and(
            eq(photos.householdId, householdId),
            eq(photos.entityType, "box"),
            isNull(photos.deletedAt),
            inArray(photos.entityId, rows.map((r) => r.id)),
          ),
        )
        .orderBy(asc(photos.createdAt))
    : [];
  const coverByBox = new Map<string, string>();
  for (const c of covers) if (!coverByBox.has(c.entityId)) coverByBox.set(c.entityId, c.id);

  const counts = rows.length
    ? await db
        .select({ boxId: boxItems.boxId, objects: sql<string>`sum(${boxItems.quantity})` })
        .from(boxItems)
        .where(and(eq(boxItems.householdId, householdId), isNull(boxItems.deletedAt), inArray(boxItems.boxId, rows.map((r) => r.id))))
        .groupBy(boxItems.boxId)
    : [];
  const objectsByBox = new Map(counts.map((c) => [c.boxId, Number(c.objects)]));

  return rows.map((b) => ({ ...b, coverPhotoId: coverByBox.get(b.id) ?? null, objects: objectsByBox.get(b.id) ?? 0 }));
}

/** Marca la caja como actualizada (contenido o fotos cambiaron). */
export async function touchBox(boxId: string) {
  await db.update(boxes).set({ updatedAt: new Date() }).where(eq(boxes.id, boxId));
}

export async function getBoxContent(box: typeof boxes.$inferSelect) {
  const [items, pics] = await Promise.all([
    db
      .select()
      .from(boxItems)
      .where(and(eq(boxItems.boxId, box.id), eq(boxItems.householdId, box.householdId), isNull(boxItems.deletedAt)))
      .orderBy(asc(boxItems.createdAt)),
    db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.entityType, "box"),
          eq(photos.entityId, box.id),
          eq(photos.householdId, box.householdId),
          isNull(photos.deletedAt),
        ),
      )
      .orderBy(asc(photos.createdAt)),
  ]);
  return { items, photos: pics };
}

/**
 * Crea la caja de forma idempotente (el id lo genera el cliente; sirve para reintentos offline).
 * El número correlativo se asigna dentro de una transacción que bloquea la fila del hogar,
 * así dos cajas creadas a la vez nunca comparten número ni se agotan reintentos.
 */
export async function createBox(
  householdId: string,
  userId: string,
  input: { id?: string; name: string; location?: string | null; notes?: string | null; color?: (typeof boxes.$inferSelect)["color"] },
) {
  const id = input.id ?? randomUUID();
  const colors = ["blue", "orange", "green", "purple"] as const;

  return db.transaction(async (tx) => {
    await tx.select({ id: schema.households.id }).from(schema.households).where(eq(schema.households.id, householdId)).for("update");

    const [existing] = await tx.select().from(boxes).where(eq(boxes.id, id));
    if (existing) return existing.householdId === householdId ? existing : null; // reintento, o id de otro hogar

    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${boxes.number}), 0) + 1` })
      .from(boxes)
      .where(eq(boxes.householdId, householdId));
    const number = Number(next);
    await tx.insert(boxes).values({
      id,
      householdId,
      createdBy: userId,
      number,
      color: input.color ?? colors[(number - 1) % colors.length],
      name: input.name,
      location: input.location ?? null,
      notes: input.notes ?? null,
    });
    const [row] = await tx.select().from(boxes).where(eq(boxes.id, id));
    return row;
  });
}
