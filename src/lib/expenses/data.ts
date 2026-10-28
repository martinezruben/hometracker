import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { monthRange } from "./month";

const { expenses, contacts, householdMembers } = schema;

export async function getExpenseAccess(userId: string, id: string) {
  const [row] = await db
    .select({ expense: expenses, role: householdMembers.role })
    .from(expenses)
    .innerJoin(
      householdMembers,
      and(eq(householdMembers.householdId, expenses.householdId), eq(householdMembers.userId, userId)),
    )
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)));
  return row ?? null;
}

export async function validateProvider(householdId: string, providerId?: string | null) {
  if (!providerId) return true;
  const [c] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, providerId), eq(contacts.householdId, householdId), isNull(contacts.deletedAt)));
  return !!c;
}

export async function createExpense(
  householdId: string,
  userId: string,
  input: Omit<typeof expenses.$inferInsert, "householdId" | "createdBy" | "id" | "receiptKey"> & { id?: string },
) {
  if (!(await validateProvider(householdId, input.providerId))) return null;
  const id = input.id ?? randomUUID();
  await db
    .insert(expenses)
    .values({ ...input, id, householdId, createdBy: userId })
    .onDuplicateKeyUpdate({ set: { id } });
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
  return row.householdId === householdId ? row : null;
}

/** Gastos del mes, total y desglose por categoría (de mayor a menor). */
export async function monthSummary(householdId: string, month: string) {
  const { start, end } = monthRange(month);
  const inMonth = and(
    eq(expenses.householdId, householdId),
    isNull(expenses.deletedAt),
    gte(expenses.spentAt, start),
    lt(expenses.spentAt, end),
  );
  const [items, cats] = await Promise.all([
    db.select().from(expenses).where(inMonth).orderBy(desc(expenses.spentAt), desc(expenses.createdAt)),
    db
      .select({
        category: sql<string | null>`${expenses.category}`,
        total: sql<string>`sum(${expenses.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(expenses)
      .where(inMonth)
      .groupBy(expenses.category),
  ]);
  const byCategory = cats
    .map((c) => ({ category: c.category ?? "Sin categoría", total: Number(c.total), count: Number(c.count) }))
    .sort((a, b) => b.total - a.total);
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  return { items, byCategory, total: Math.round(total * 100) / 100 };
}
