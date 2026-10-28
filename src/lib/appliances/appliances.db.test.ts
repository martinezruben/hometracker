// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("equipos y mantenimientos (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { completePlan, createAppliance, getApplianceAccess, getPlanAccess, listAppliances, upcomingMaintenance } =
    await import("./data");
  const { formatDateOnly, parseDateOnly } = await import("@/lib/maintenance/schedule");

  describe("equipos y mantenimientos (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const users = [randomUUID(), randomUUID()];
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.maintenanceLogs).where(inArray(schema.maintenanceLogs.householdId, hogares));
      await db.delete(schema.maintenancePlans).where(inArray(schema.maintenancePlans.householdId, hogares));
      await db.delete(schema.appliances).where(inArray(schema.appliances.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, users));
    });

    it("aísla por hogar, reprograma al completar y es idempotente", async () => {
      await db.insert(schema.users).values(users.map((id, i) => ({ id, email: `ap${i}-${tag}@test.local` })));
      const h1 = await createHousehold(users[0], "Casa A");
      const h2 = await createHousehold(users[1], "Casa B");
      hogares.push(h1, h2);

      const id = randomUUID();
      const a = await createAppliance(h1, users[0], { id, name: "Aire sala", brand: "LG" });
      expect(a?.name).toBe("Aire sala");
      expect(await createAppliance(h2, users[1], { id, name: "Robo" })).toBeNull();
      expect(await getApplianceAccess(users[1], id)).toBeNull();
      expect((await getApplianceAccess(users[0], id))?.role).toBe("admin");

      const planId = randomUUID();
      await db.insert(schema.maintenancePlans).values({
        id: planId,
        householdId: h1,
        applianceId: id,
        title: "Limpiar filtros",
        intervalValue: 6,
        intervalUnit: "month",
        nextDue: parseDateOnly("2026-01-31"),
        remindDaysBefore: 7,
      });
      expect(await getPlanAccess(users[1], planId)).toBeNull();

      const access = (await getPlanAccess(users[0], planId))!;
      const logId = randomUUID();
      const first = await completePlan(access.plan, users[0], { id: logId, doneAt: parseDateOnly("2026-08-31"), cost: 45.5 });
      expect(first?.repeated).toBe(false);
      const [after] = await db.select().from(schema.maintenancePlans).where(eq(schema.maintenancePlans.id, planId));
      expect(formatDateOnly(after.nextDue)).toBe("2027-02-28");

      // reintento con el mismo id: no vuelve a mover el vencimiento
      const again = await completePlan(after, users[0], { id: logId, doneAt: parseDateOnly("2026-08-31") });
      expect(again?.repeated).toBe(true);
      const [still] = await db.select().from(schema.maintenancePlans).where(eq(schema.maintenancePlans.id, planId));
      expect(formatDateOnly(still.nextDue)).toBe("2027-02-28");

      const logs = await db.select().from(schema.maintenanceLogs).where(eq(schema.maintenanceLogs.planId, planId));
      expect(logs).toHaveLength(1);
      expect(logs[0].cost).toBe(45.5);

      expect((await listAppliances(h1))[0].nextDue).toEqual(still.nextDue);
      expect((await upcomingMaintenance(h1)).map((u) => u.planId)).toEqual([planId]);
      expect(await upcomingMaintenance(h2)).toEqual([]);
    });
  });
}
