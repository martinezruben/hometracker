// Pruebas de integración: requieren MySQL (DATABASE_URL). Se omiten si no está definida.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

if (!hasDb) {
  describe.skip("resumen de Inicio (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { homeStats } = await import("./stats");

  describe("resumen de Inicio (MySQL)", () => {
    const a = randomUUID();
    const b = randomUUID();
    const boxA = randomUUID();
    afterAll(async () => {
      for (const h of [a, b]) {
        await db.delete(schema.expenses).where(eq(schema.expenses.householdId, h));
        await db.delete(schema.tasks).where(eq(schema.tasks.householdId, h));
        await db.delete(schema.boxItems).where(eq(schema.boxItems.householdId, h));
        await db.delete(schema.boxes).where(eq(schema.boxes.householdId, h));
        await db.delete(schema.households).where(eq(schema.households.id, h));
      }
    });

    it("cuenta solo lo del hogar: cajas, objetos, pendientes abiertos y gasto del mes", async () => {
      for (const h of [a, b]) await db.insert(schema.households).values({ id: h, name: `Hogar ${h.slice(0, 4)}` });
      const now = new Date("2026-11-15T12:00:00Z");
      await db.insert(schema.boxes).values([
        { id: boxA, householdId: a, name: "A", number: 1 },
        { id: randomUUID(), householdId: b, name: "Ajena", number: 1 },
      ]);
      await db.insert(schema.boxItems).values([
        { id: randomUUID(), householdId: a, boxId: boxA, title: "x", quantity: 3 },
        { id: randomUUID(), householdId: a, boxId: boxA, title: "y", quantity: 2 },
      ]);
      await db.insert(schema.tasks).values([
        { id: randomUUID(), householdId: a, title: "abierta" },
        { id: randomUUID(), householdId: a, title: "hecha", doneAt: new Date("2026-11-01T00:00:00Z") },
        { id: randomUUID(), householdId: b, title: "ajena" },
      ]);
      await db.insert(schema.expenses).values([
        { id: randomUUID(), householdId: a, title: "nov", amount: 40, spentAt: new Date("2026-11-03T00:00:00Z") },
        { id: randomUUID(), householdId: a, title: "oct", amount: 99, spentAt: new Date("2026-10-30T00:00:00Z") },
        { id: randomUUID(), householdId: b, title: "ajeno", amount: 500, spentAt: new Date("2026-11-03T00:00:00Z") },
      ]);

      expect(await homeStats(a, now)).toEqual({ boxes: 1, objects: 5, appliances: 0, openTasks: 1, monthExpenses: 40 });
      expect((await homeStats(b, now)).monthExpenses).toBe(500);
    });
  });
}
