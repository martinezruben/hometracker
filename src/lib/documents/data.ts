import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { documents, contacts, appliances, householdMembers } = schema;

export async function getDocumentAccess(userId: string, id: string) {
  const [row] = await db
    .select({ document: documents, role: householdMembers.role })
    .from(documents)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, documents.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)));
  return row ?? null;
}

/** El proveedor y el equipo vinculados deben ser del mismo hogar. */
export async function validateLinks(householdId: string, providerId?: string | null, applianceId?: string | null) {
  if (providerId) {
    const [c] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, providerId), eq(contacts.householdId, householdId), isNull(contacts.deletedAt)));
    if (!c) return false;
  }
  if (applianceId) {
    const [a] = await db
      .select({ id: appliances.id })
      .from(appliances)
      .where(and(eq(appliances.id, applianceId), eq(appliances.householdId, householdId), isNull(appliances.deletedAt)));
    if (!a) return false;
  }
  return true;
}

export async function createDocument(
  householdId: string,
  userId: string,
  input: Omit<typeof documents.$inferInsert, "householdId" | "createdBy" | "id" | "fileKey"> & { id?: string },
) {
  if (!(await validateLinks(householdId, input.providerId, input.applianceId))) return null;
  const id = input.id ?? randomUUID();
  await db
    .insert(documents)
    .values({ ...input, id, householdId, createdBy: userId })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(documents).where(eq(documents.id, id));
  return row.householdId === householdId ? row : null;
}

export async function listDocuments(householdId: string, opts: { kind?: string; q?: string } = {}) {
  const term = opts.q?.trim();
  const pattern = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.householdId, householdId),
        isNull(documents.deletedAt),
        opts.kind ? eq(documents.kind, opts.kind as typeof documents.$inferSelect.kind) : undefined,
        pattern ? or(like(documents.title, pattern), like(documents.notes, pattern)) : undefined,
      ),
    )
    // con vencimiento primero (el más cercano), luego los demás por fecha de alta
    .orderBy(sql`${documents.expiresAt} is null`, asc(documents.expiresAt), desc(documents.createdAt));
}
