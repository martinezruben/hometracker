// Pruebas de integración (requieren DATABASE_URL): el endpoint de completar rechaza proveedores ajenos.
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("completar mantenimiento (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { createContact } = await import("@/lib/contacts/data");
  const { validateLinks } = await import("@/lib/documents/data");

  describe("completar mantenimiento (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B] = [randomUUID(), randomUUID()];
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.contacts).where(inArray(schema.contacts.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B]));
    });

    it("solo acepta como proveedor a un contacto del mismo hogar", async () => {
      await db.insert(schema.users).values([A, B].map((id, i) => ({ id, email: `cp${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa A");
      const h2 = await createHousehold(B, "Casa B");
      hogares.push(h1, h2);
      const propio = randomUUID();
      const ajeno = randomUUID();
      const base = { category: null, phone: null, email: null, rating: null, notes: null };
      await createContact(h1, A, { id: propio, name: "Propio", ...base });
      await createContact(h2, B, { id: ajeno, name: "Ajeno", ...base });
      expect(await validateLinks(h1, null)).toBe(true);
      expect(await validateLinks(h1, propio)).toBe(true);
      expect(await validateLinks(h1, ajeno)).toBe(false);
    });
  });
}
