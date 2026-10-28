// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("cajas (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { createBox, getBoxAccess, getBoxContent, listBoxes } = await import("./data");

  describe("cajas (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const users = ["a", "b"].map(() => randomUUID());
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.boxItems).where(inArray(schema.boxItems.householdId, hogares));
      await db.delete(schema.boxes).where(inArray(schema.boxes.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, users));
    });

    it("solo los miembros del hogar acceden a la caja; crear es idempotente; búsqueda por contenido", async () => {
      await db.insert(schema.users).values(users.map((id, i) => ({ id, email: `box${i}-${tag}@test.local` })));
      const h1 = await createHousehold(users[0], "Casa A");
      const h2 = await createHousehold(users[1], "Casa B");
      hogares.push(h1, h2);

      const id = randomUUID();
      const box = await createBox(h1, users[0], { id, name: "Navidad", location: "Bodega" });
      expect(box?.name).toBe("Navidad");
      // reintento con el mismo id (cola offline) no duplica ni modifica
      await createBox(h1, users[0], { id, name: "Otro nombre" });
      expect((await getBoxAccess(users[0], id))?.box.name).toBe("Navidad");
      // otro hogar no puede reclamar el mismo id
      expect(await createBox(h2, users[1], { id, name: "Robo" })).toBeNull();

      expect((await getBoxAccess(users[0], id))?.role).toBe("admin");
      expect(await getBoxAccess(users[1], id)).toBeNull();

      await db.insert(schema.boxItems).values({ id: randomUUID(), householdId: h1, boxId: id, title: "Luces LED" });
      expect((await listBoxes(h1, "luces")).map((b) => b.id)).toEqual([id]);
      expect(await listBoxes(h2, "luces")).toEqual([]);
      expect((await getBoxContent(box!)).items).toHaveLength(1);

      await db.update(schema.boxes).set({ deletedAt: new Date() }).where(eq(schema.boxes.id, id));
      expect(await getBoxAccess(users[0], id)).toBeNull();
    });
  });
}
