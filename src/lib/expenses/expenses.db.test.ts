// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("gastos (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { createContact } = await import("@/lib/contacts/data");
  const { createExpense, getExpenseAccess, monthSummary } = await import("./data");
  const { parseDateOnly } = await import("@/lib/maintenance/schedule");

  describe("gastos (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B] = [randomUUID(), randomUUID()];
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.expenses).where(inArray(schema.expenses.householdId, hogares));
      await db.delete(schema.contacts).where(inArray(schema.contacts.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B]));
    });

    const exp = (title: string, amount: number, date: string, category: string | null, extra: object = {}) => ({
      title, amount, spentAt: parseDateOnly(date), category, providerId: null, notes: null, ...extra,
    });

    it("resume por mes y categoría, aísla hogares y valida el proveedor", async () => {
      await db.insert(schema.users).values([A, B].map((id, i) => ({ id, email: `exp${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa A");
      const h2 = await createHousehold(B, "Casa B");
      hogares.push(h1, h2);

      const id = randomUUID();
      expect(await createExpense(h1, A, { id, ...exp("Luz", 80.25, "2026-06-05", "Servicios") })).toMatchObject({ title: "Luz", amount: 80.25 });
      await createExpense(h1, A, exp("Agua", 20, "2026-06-30", "Servicios"));
      await createExpense(h1, A, exp("Plomero", 150, "2026-06-12", "Reparaciones"));
      await createExpense(h1, A, exp("Sin categoría", 10, "2026-06-01", null));
      await createExpense(h1, A, exp("Mes siguiente", 999, "2026-07-01", "Servicios")); // límite: fuera de junio
      await createExpense(h1, A, exp("Mes anterior", 999, "2026-05-31", "Servicios"));
      expect(await createExpense(h2, B, { id, ...exp("Robo", 1, "2026-06-01", null) })).toBeNull();

      const june = await monthSummary(h1, "2026-06");
      expect(june.items).toHaveLength(4);
      expect(june.total).toBe(260.25);
      expect(june.byCategory.map((c) => [c.category, c.total])).toEqual([
        ["Reparaciones", 150],
        ["Servicios", 100.25],
        ["Sin categoría", 10],
      ]);
      expect(june.items[0].title).toBe("Agua"); // más reciente primero
      expect((await monthSummary(h2, "2026-06")).total).toBe(0);
      expect(await getExpenseAccess(B, id)).toBeNull();
      expect((await getExpenseAccess(A, id))?.role).toBe("admin");

      // un proveedor de otro hogar no se puede vincular
      const cid = randomUUID();
      await createContact(h2, B, { id: cid, name: "Ajeno", category: null, phone: null, email: null, rating: null, notes: null });
      expect(await createExpense(h1, A, exp("Mal vinculado", 5, "2026-06-02", null, { providerId: cid }))).toBeNull();

      await db.update(schema.expenses).set({ deletedAt: new Date() }).where(eq(schema.expenses.id, id));
      expect((await monthSummary(h1, "2026-06")).total).toBe(180);
    });
  });
}
