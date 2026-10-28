// Pruebas de integración (requieren DATABASE_URL).
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

if (!process.env.DATABASE_URL) {
  describe.skip("recordatorios (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createHousehold } = await import("@/lib/households");
  const { runReminders, endpointHash } = await import("./run");

  const DAY = 24 * 60 * 60 * 1000;

  describe("recordatorios (MySQL)", () => {
    const tag = randomUUID().slice(0, 8);
    const [A, B, C] = [randomUUID(), randomUUID(), randomUUID()];
    const hogares: string[] = [];
    const endpoint = (u: string) => `https://push.example/${tag}/${u}`;

    afterAll(async () => {
      await db.delete(schema.reminders).where(inArray(schema.reminders.householdId, hogares));
      await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.userId, [A, B, C]));
      await db.delete(schema.maintenancePlans).where(inArray(schema.maintenancePlans.householdId, hogares));
      await db.delete(schema.appliances).where(inArray(schema.appliances.householdId, hogares));
      await db.delete(schema.householdMembers).where(inArray(schema.householdMembers.householdId, hogares));
      await db.delete(schema.households).where(inArray(schema.households.id, hogares));
      await db.delete(schema.users).where(inArray(schema.users.id, [A, B, C]));
    });

    async function setup() {
      await db.insert(schema.users).values([A, B, C].map((id, i) => ({ id, email: `rem${i}-${tag}@test.local` })));
      const h1 = await createHousehold(A, "Casa 1");
      await db.insert(schema.householdMembers).values({ householdId: h1, userId: B, role: "member" });
      const h2 = await createHousehold(C, "Casa 2");
      hogares.push(h1, h2);
      for (const u of [A, B, C]) {
        await db.insert(schema.pushSubscriptions).values({
          id: randomUUID(),
          userId: u,
          endpointHash: endpointHash(endpoint(u)),
          endpoint: endpoint(u),
          p256dh: "p",
          auth: "a",
        });
      }
      const applianceId = randomUUID();
      await db.insert(schema.appliances).values({ id: applianceId, householdId: h1, name: "Aire" });
      const c2 = randomUUID();
      await db.insert(schema.appliances).values({ id: c2, householdId: h2, name: "Nevera" });
      return { h1, h2, applianceId, c2 };
    }

    const plan = (householdId: string, applianceId: string, nextDue: Date, extra: object = {}) =>
      db.insert(schema.maintenancePlans).values({
        id: randomUUID(),
        householdId,
        applianceId,
        title: "Filtros",
        intervalValue: 6,
        intervalUnit: "month",
        nextDue,
        remindDaysBefore: 7,
        ...extra,
      });

    it("envía una vez a los miembros del hogar, sin duplicar, y respeta reintentos y suscripciones caídas", async () => {
      const now = new Date();
      const { h1, applianceId } = await setup();
      const sentTo: string[] = [];
      const send = async (s: { endpoint: string }) => {
        sentTo.push(s.endpoint);
        return "sent" as const;
      };

      // vence en 3 días con aviso de 7: ya toca avisar
      await plan(h1, applianceId, new Date(now.getTime() + 3 * DAY));
      // vence en 30 días: todavía no
      await plan(h1, applianceId, new Date(now.getTime() + 30 * DAY));
      // venció hace 40 días: demasiado viejo
      await plan(h1, applianceId, new Date(now.getTime() - 40 * DAY));

      const r1 = await runReminders(send, now);
      expect(r1).toMatchObject({ created: 2, sent: 2 });
      expect(sentTo.sort()).toEqual([endpoint(A), endpoint(B)].sort()); // C es de otro hogar
      const r2 = await runReminders(send, now);
      expect(r2).toMatchObject({ created: 0, sent: 0 });
    });

    it("reintenta si falla de forma transitoria, borra suscripciones caídas y solo avisa al asignado", async () => {
      const now = new Date(Date.now() + 1000);
      const h1 = hogares[0];
      const [{ id: applianceId }] = await db.select({ id: schema.appliances.id }).from(schema.appliances).where(inArray(schema.appliances.householdId, [h1]));
      // vencido ayer, asignado solo a B: genera aviso previo + aviso del día
      await plan(h1, applianceId, new Date(now.getTime() - DAY), { title: "Motor", assignedTo: B });

      let mode: "retry" | "gone" | "sent" = "retry";
      const calls: string[] = [];
      const send = async (s: { endpoint: string }) => {
        calls.push(s.endpoint);
        return mode;
      };
      const r1 = await runReminders(send, now);
      expect(r1).toMatchObject({ created: 2, sent: 0, retried: 2 });
      expect(new Set(calls)).toEqual(new Set([endpoint(B)]));

      mode = "gone";
      const r2 = await runReminders(send, now);
      expect(r2.removed).toBe(1); // la suscripción caída se borra una sola vez
      const left = await db.select().from(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.userId, [B]));
      expect(left).toHaveLength(0);
    });
  });
}
