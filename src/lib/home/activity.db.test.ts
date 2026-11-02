// Pruebas de integración: requieren MySQL (DATABASE_URL). Se omiten si no está definida.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

if (!hasDb) {
  describe.skip("actividad reciente (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { recentActivity } = await import("./activity");

  describe("actividad reciente (MySQL)", () => {
    const a = randomUUID();
    const b = randomUUID();
    afterAll(async () => {
      for (const h of [a, b]) {
        await db.delete(schema.expenses).where(eq(schema.expenses.householdId, h));
        await db.delete(schema.households).where(eq(schema.households.id, h));
      }
    });

    it("muestra solo lo del hogar, lo más reciente primero, y no lo futuro", async () => {
      for (const h of [a, b]) await db.insert(schema.households).values({ id: h, name: `Hogar ${h.slice(0, 4)}` });
      const day = (n: number) => new Date(Date.now() + n * 864e5);
      const exp = (h: string, title: string, n: number) => db.insert(schema.expenses).values({ id: randomUUID(), householdId: h, title, amount: 10, spentAt: day(n) });
      await exp(a, "Luz", -3);
      await exp(a, "Agua", -1);
      await exp(a, "Futuro", 5);
      await exp(b, "Ajeno", -1);

      const events = await recentActivity(a);
      expect(events.map((e) => e.title)).toEqual(["Agua", "Luz"]);
    });
  });
}
