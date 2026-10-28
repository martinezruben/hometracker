// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("contactos y documentos (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { createContact, getContactAccess, listContacts } = await import("@/lib/contacts/data");
  const { createDocument, getDocumentAccess, listDocuments, validateLinks } = await import("./data");
  const { createAppliance } = await import("@/lib/appliances/data");
  const { parseDateOnly } = await import("@/lib/maintenance/schedule");

  describe("contactos y documentos (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B] = [randomUUID(), randomUUID()];
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.documents).where(inArray(schema.documents.householdId, hogares));
      await db.delete(schema.contacts).where(inArray(schema.contacts.householdId, hogares));
      await db.delete(schema.appliances).where(inArray(schema.appliances.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B]));
    });

    it("aísla por hogar, busca y valida vínculos entre hogares", async () => {
      await db.insert(schema.users).values([A, B].map((id, i) => ({ id, email: `doc${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa A");
      const h2 = await createHousehold(B, "Casa B");
      hogares.push(h1, h2);

      const cid = randomUUID();
      const contact = await createContact(h1, A, { id: cid, name: "Pedro Plomero", category: "Plomero", phone: "809 555 1234", email: null, rating: 5, notes: null });
      expect(contact?.name).toBe("Pedro Plomero");
      expect(await createContact(h2, B, { id: cid, name: "Robo", category: null, phone: null, email: null, rating: null, notes: null })).toBeNull();
      expect(await getContactAccess(B, cid)).toBeNull();
      expect((await listContacts(h1, "plom")).map((c) => c.id)).toEqual([cid]);
      expect(await listContacts(h2, "plom")).toEqual([]);

      const aid = randomUUID();
      await createAppliance(h2, B, { id: aid, name: "Nevera de B" });
      // un proveedor o equipo de otro hogar no se puede vincular
      expect(await validateLinks(h1, cid, null)).toBe(true);
      expect(await validateLinks(h1, null, aid)).toBe(false);
      expect(await validateLinks(h2, cid, null)).toBe(false);
      expect(
        await createDocument(h1, A, { kind: "contract", title: "Mal vinculado", issuedAt: null, expiresAt: null, amount: null, providerId: null, applianceId: aid, notes: null }),
      ).toBeNull();

      const did = randomUUID();
      const doc = await createDocument(h1, A, { id: did, kind: "contract", title: "Seguro del hogar", issuedAt: null, expiresAt: parseDateOnly("2027-01-01"), amount: 350.5, providerId: cid, applianceId: null, notes: null });
      expect(doc?.amount).toBe(350.5);
      await createDocument(h1, A, { kind: "receipt", title: "Recibo luz", issuedAt: null, expiresAt: null, amount: null, providerId: null, applianceId: null, notes: null });
      expect(await getDocumentAccess(B, did)).toBeNull();
      expect((await getDocumentAccess(A, did))?.role).toBe("admin");
      const all = await listDocuments(h1);
      expect(all.map((d) => d.title)).toEqual(["Seguro del hogar", "Recibo luz"]); // con vencimiento primero
      expect((await listDocuments(h1, { kind: "receipt" })).map((d) => d.title)).toEqual(["Recibo luz"]);
      expect((await listDocuments(h1, { q: "seguro" })).map((d) => d.id)).toEqual([did]);
      expect(await listDocuments(h2)).toEqual([]);
      await db.update(schema.documents).set({ deletedAt: new Date() }).where(eq(schema.documents.id, did));
      expect(await getDocumentAccess(A, did)).toBeNull();
    });
  });
}
