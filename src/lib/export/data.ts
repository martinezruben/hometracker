import { and, eq, isNull } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";

/** Todos los datos del hogar (sin borrados lógicos) para llevárselos. No incluye los archivos adjuntos. */
export async function exportHousehold(householdId: string) {
  const s = schema;
  const scope = (t: { householdId: AnyMySqlColumn; deletedAt: AnyMySqlColumn }) =>
    and(eq(t.householdId, householdId), isNull(t.deletedAt));

  const [household] = await db
    .select({ id: s.households.id, name: s.households.name })
    .from(s.households)
    .where(eq(s.households.id, householdId));
  const [boxes, boxItems, appliances, maintenancePlans, maintenanceLogs, lists, listItems, tasks, contacts, documents, expenses] =
    await Promise.all([
      db.select().from(s.boxes).where(scope(s.boxes)),
      db.select().from(s.boxItems).where(scope(s.boxItems)),
      db.select().from(s.appliances).where(scope(s.appliances)),
      db.select().from(s.maintenancePlans).where(scope(s.maintenancePlans)),
      db.select().from(s.maintenanceLogs).where(scope(s.maintenanceLogs)),
      db.select().from(s.lists).where(scope(s.lists)),
      db.select().from(s.listItems).where(scope(s.listItems)),
      db.select().from(s.tasks).where(scope(s.tasks)),
      db.select().from(s.contacts).where(scope(s.contacts)),
      db.select().from(s.documents).where(scope(s.documents)),
      db.select().from(s.expenses).where(scope(s.expenses)),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    household,
    boxes,
    boxItems,
    appliances,
    maintenancePlans,
    maintenanceLogs,
    lists,
    listItems,
    tasks,
    contacts,
    documents,
    expenses,
  };
}
