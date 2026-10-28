// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("búsqueda y exportación (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { globalSearch, likePattern } = await import("./data");
  const { exportHousehold } = await import("@/lib/export/data");

  describe("búsqueda y exportación (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B] = [randomUUID(), randomUUID()];
    const hogares: string[] = [];
    const word = `zorro${tag}`; // palabra única para esta ejecución

    afterAll(async () => {
      for (const t of [schema.listItems, schema.lists, schema.tasks, schema.contacts, schema.expenses, schema.boxItems, schema.boxes]) {
        await db.delete(t).where(inArray(t.householdId, hogares));
      }
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B]));
    });

    it("encuentra en todos los módulos solo dentro del hogar, ignora borrados y escapa comodines", async () => {
      await db.insert(schema.users).values([A, B].map((id, i) => ({ id, email: `sr${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa A");
      const h2 = await createHousehold(B, "Casa B");
      hogares.push(h1, h2);

      const box = randomUUID();
      const list = randomUUID();
      await db.insert(schema.boxes).values([
        { id: box, householdId: h1, name: `Caja ${word}` },
        { id: randomUUID(), householdId: h2, name: `Caja ajena ${word}` },
        { id: randomUUID(), householdId: h1, name: `Borrada ${word}`, deletedAt: new Date() },
      ]);
      await db.insert(schema.boxItems).values({ id: randomUUID(), householdId: h1, boxId: box, title: "Cosa" });
      await db.insert(schema.lists).values({ id: list, householdId: h1, name: "Súper" });
      await db.insert(schema.listItems).values({ id: randomUUID(), householdId: h1, listId: list, title: `Queso ${word}` });
      await db.insert(schema.tasks).values({ id: randomUUID(), householdId: h1, title: `Llamar ${word}` });
      await db.insert(schema.contacts).values({ id: randomUUID(), householdId: h1, name: `Pedro ${word}` });
      await db.insert(schema.expenses).values({ id: randomUUID(), householdId: h1, title: `Compra ${word}`, amount: 5, spentAt: new Date() });

      const r = await globalSearch(h1, word);
      expect(r.boxes.map((b) => b.title)).toEqual([`Caja ${word}`]); // ni ajena ni borrada
      expect(r.lists).toEqual([expect.objectContaining({ title: "Súper", subtitle: `Queso ${word}` })]);
      expect(r.tasks).toHaveLength(1);
      expect(r.contacts).toHaveLength(1);
      expect(r.expenses).toHaveLength(1);
      const other = await globalSearch(h2, word);
      expect(other.boxes).toHaveLength(1);
      expect(other.tasks).toHaveLength(0);

      expect(Object.values(await globalSearch(h1, "a")).flat()).toEqual([]); // menos de 2 letras
      expect(Object.values(await globalSearch(h1, "%%")).flat()).toEqual([]); // el comodín se escapa
      expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
    });

    it("exporta solo los datos vivos del hogar", async () => {
      const [h1, h2] = hogares;
      const data = await exportHousehold(h1);
      expect(data.household?.name).toBe("Casa A");
      expect(data.boxes.map((b) => b.name)).toEqual([`Caja ${word}`]); // sin la borrada ni la ajena
      expect(data.listItems).toHaveLength(1);
      expect(data.expenses).toHaveLength(1);
      expect(JSON.stringify(data)).not.toContain("Caja ajena");
      expect((await exportHousehold(h2)).boxes).toHaveLength(1);
    });
  });
}
