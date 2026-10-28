import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";

const { lists, listItems, photos, householdMembers } = schema;

const member = (householdCol: AnyMySqlColumn, userId: string) =>
  and(eq(householdMembers.householdId, householdCol), eq(householdMembers.userId, userId));

export async function getListAccess(userId: string, id: string) {
  const [row] = await db
    .select({ list: lists, role: householdMembers.role })
    .from(lists)
    .innerJoin(householdMembers, member(lists.householdId, userId))
    .where(and(eq(lists.id, id), isNull(lists.deletedAt)));
  return row ?? null;
}

export async function getListItemAccess(userId: string, id: string) {
  const [row] = await db
    .select({ item: listItems, role: householdMembers.role })
    .from(listItems)
    .innerJoin(householdMembers, member(listItems.householdId, userId))
    .where(and(eq(listItems.id, id), isNull(listItems.deletedAt)));
  return row ?? null;
}

export async function createList(
  householdId: string,
  userId: string,
  input: { id?: string; name: string; type: "shopping" | "sale" | "general" },
) {
  const id = input.id ?? randomUUID();
  await db
    .insert(lists)
    .values({ id, householdId, createdBy: userId, name: input.name, type: input.type })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(lists).where(eq(lists.id, id));
  return row.householdId === householdId ? row : null;
}

/** Listas del hogar con el número de elementos pendientes. */
export async function listLists(householdId: string) {
  const rows = await db
    .select()
    .from(lists)
    .where(and(eq(lists.householdId, householdId), isNull(lists.deletedAt)))
    .orderBy(asc(lists.type), asc(lists.name));
  if (!rows.length) return [];
  const counts = await db
    .select({
      listId: listItems.listId,
      total: sql<number>`count(*)`,
      open: sql<number>`sum(case when ${listItems.checked} = 0 and ${listItems.status} in ('pending','available') then 1 else 0 end)`,
    })
    .from(listItems)
    .where(
      and(
        eq(listItems.householdId, householdId),
        isNull(listItems.deletedAt),
        inArray(listItems.listId, rows.map((r) => r.id)),
      ),
    )
    .groupBy(listItems.listId);
  const byList = new Map(counts.map((c) => [c.listId, { total: Number(c.total), open: Number(c.open ?? 0) }]));
  return rows.map((l) => ({ ...l, total: byList.get(l.id)?.total ?? 0, open: byList.get(l.id)?.open ?? 0 }));
}

export async function getListContent(list: typeof lists.$inferSelect) {
  const items = await db
    .select()
    .from(listItems)
    .where(and(eq(listItems.listId, list.id), eq(listItems.householdId, list.householdId), isNull(listItems.deletedAt)))
    .orderBy(asc(listItems.checked), asc(listItems.createdAt));
  const pics = items.length
    ? await db
        .select({ id: photos.id, entityId: photos.entityId })
        .from(photos)
        .where(
          and(
            eq(photos.householdId, list.householdId),
            eq(photos.entityType, "list_item"),
            isNull(photos.deletedAt),
            inArray(photos.entityId, items.map((i) => i.id)),
          ),
        )
        .orderBy(asc(photos.createdAt))
    : [];
  const photosByItem = new Map<string, { id: string }[]>();
  for (const p of pics) photosByItem.set(p.entityId, [...(photosByItem.get(p.entityId) ?? []), { id: p.id }]);
  return items.map((i) => ({ ...i, photos: photosByItem.get(i.id) ?? [] }));
}

