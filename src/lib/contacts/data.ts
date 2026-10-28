import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, like, or } from "drizzle-orm";
import { db, schema } from "@/db";

const { contacts, householdMembers } = schema;

export async function getContactAccess(userId: string, id: string) {
  const [row] = await db
    .select({ contact: contacts, role: householdMembers.role })
    .from(contacts)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, contacts.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)));
  return row ?? null;
}

export async function createContact(
  householdId: string,
  userId: string,
  input: Omit<typeof contacts.$inferInsert, "householdId" | "createdBy" | "id"> & { id?: string },
) {
  const id = input.id ?? randomUUID();
  await db
    .insert(contacts)
    .values({ ...input, id, householdId, createdBy: userId })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
  return row.householdId === householdId ? row : null;
}

export async function listContacts(householdId: string, q?: string) {
  const term = q?.trim();
  const pattern = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;
  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.householdId, householdId),
        isNull(contacts.deletedAt),
        pattern
          ? or(like(contacts.name, pattern), like(contacts.category, pattern), like(contacts.phone, pattern), like(contacts.notes, pattern))
          : undefined,
      ),
    )
    .orderBy(asc(contacts.name));
}
