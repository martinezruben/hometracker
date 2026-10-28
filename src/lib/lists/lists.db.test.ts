// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("listas y pendientes (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { createList, getListAccess, getListContent, getListItemAccess, listLists } = await import("./data");
  const { completeTask, createTask, getTaskAccess, listTasks, listMembers } = await import("@/lib/tasks/data");
  const { formatDateOnly, parseDateOnly } = await import("@/lib/maintenance/schedule");

  describe("listas y pendientes (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B] = [randomUUID(), randomUUID()];
    const hogares: string[] = [];

    afterAll(async () => {
      await db.delete(schema.listItems).where(inArray(schema.listItems.householdId, hogares));
      await db.delete(schema.lists).where(inArray(schema.lists.householdId, hogares));
      await db.delete(schema.tasks).where(inArray(schema.tasks.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B]));
    });

    it("listas: aislamiento por hogar, conteo de pendientes y contenido", async () => {
      await db.insert(schema.users).values([A, B].map((id, i) => ({ id, email: `ls${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa A");
      const h2 = await createHousehold(B, "Casa B");
      hogares.push(h1, h2);

      const id = randomUUID();
      const list = await createList(h1, A, { id, name: "Súper", type: "shopping" });
      expect(list?.name).toBe("Súper");
      expect(await createList(h2, B, { id, name: "Robo", type: "general" })).toBeNull();
      expect(await getListAccess(B, id)).toBeNull();

      const [i1, i2] = [randomUUID(), randomUUID()];
      await db.insert(schema.listItems).values([
        { id: i1, householdId: h1, listId: id, title: "Leche" },
        { id: i2, householdId: h1, listId: id, title: "Pan", checked: true },
      ]);
      expect(await getListItemAccess(B, i1)).toBeNull();
      expect((await getListItemAccess(A, i1))?.role).toBe("admin");
      const summary = (await listLists(h1))[0];
      expect(summary).toMatchObject({ total: 2, open: 1 });
      expect(await listLists(h2)).toEqual([]);
      expect((await getListContent(list!)).map((i) => i.title)).toEqual(["Leche", "Pan"]); // sin marcar primero
      await db.update(schema.listItems).set({ deletedAt: new Date() }).where(eq(schema.listItems.id, i1));
      expect((await listLists(h1))[0]).toMatchObject({ total: 1, open: 0 });
    });

    it("pendientes: aislamiento, asignación solo a miembros y completar idempotente", async () => {
      const [h1, h2] = hogares;
      const id = randomUUID();
      const t = await createTask(h1, A, { id, title: "Pagar luz", dueAt: parseDateOnly("2026-06-01"), repeatRule: null, assignedTo: null, notes: null });
      expect(t?.title).toBe("Pagar luz");
      expect(await createTask(h2, B, { id, title: "Robo", dueAt: null, repeatRule: null, assignedTo: null, notes: null })).toBeNull();
      expect(await createTask(h1, A, { title: "x", dueAt: null, repeatRule: null, assignedTo: B, notes: null })).toBeNull(); // B no es miembro de h1
      expect(await getTaskAccess(B, id)).toBeNull();
      expect((await listMembers(h1)).map((m) => m.id)).toEqual([A]);

      // tarea simple: completar dos veces solo la cierra una vez
      const now = new Date("2026-06-10T12:00:00Z");
      const first = await completeTask(t!, now);
      expect(first).toMatchObject({ done: true, repeated: false });
      expect(await completeTask({ ...t! }, now)).toMatchObject({ done: true, repeated: true });
      const lists = await listTasks(h1);
      expect(lists.open.map((x) => x.id)).not.toContain(id);
      expect(lists.done.map((x) => x.id)).toContain(id);

      // tarea recurrente: se reprograma desde hoy; el reintento con el vencimiento visto no la vuelve a mover
      const rid = randomUUID();
      const r = (await createTask(h1, A, { id: rid, title: "Sacar basura", dueAt: parseDateOnly("2026-06-08"), repeatRule: "1:week", assignedTo: null, notes: null }))!;
      const r1 = await completeTask(r, now, "2026-06-08");
      expect(r1).toMatchObject({ done: false, repeated: false });
      expect(formatDateOnly(r1.nextDue!)).toBe("2026-06-17");
      const [stored] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, rid));
      const r2 = await completeTask(stored, now, "2026-06-08"); // reintento offline con el vencimiento anterior
      expect(r2.repeated).toBe(true);
      const [still] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, rid));
      expect(formatDateOnly(still.dueAt!)).toBe("2026-06-17");
    });
  });
}
