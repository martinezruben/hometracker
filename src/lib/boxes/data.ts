import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
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

  return rows.map((b) => ({ ...b, coverPhotoId: coverByBox.get(b.id) ?? null }));
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

/** Crea la caja de forma idempotente (el id lo genera el cliente; sirve para reintentos offline). */
export async function createBox(
  householdId: string,
  userId: string,
  input: { id?: string; name: string; location?: string | null; notes?: string | null },
) {
  const id = input.id ?? randomUUID();
  await db
    .insert(boxes)
    .values({
      id,
      householdId,
      createdBy: userId,
      name: input.name,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
    .onDuplicateKeyUpdate({ set: { id } }); // reintento: no modifica nada
  const [row] = await db.select().from(boxes).where(eq(boxes.id, id));
  return row.householdId === householdId ? row : null; // el id pertenece a otro hogar → rechazar
}
