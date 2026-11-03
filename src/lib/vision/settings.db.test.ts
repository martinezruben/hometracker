// Pruebas de integración: requieren MySQL (DATABASE_URL). Se omiten si no está definida.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

if (!hasDb) {
  describe.skip("ajustes de IA (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  process.env.SESSION_SECRET ||= "prueba-ajustes-ia";
  const { db, schema } = await import("@/db");
  const { getAiStatus, resolveAiConfig, saveAiSettings, InvalidSettingError } = await import("./settings");

  describe("ajustes de IA (MySQL)", () => {
    const a = randomUUID();
    const b = randomUUID();
    const prevKey = process.env.ANTHROPIC_API_KEY;
    const KEY = "sk-ant-api03-" + "x".repeat(28) + "WXYZ";
    afterAll(async () => {
      if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prevKey;
      for (const h of [a, b]) {
        await db.delete(schema.aiSettings).where(eq(schema.aiSettings.householdId, h));
        await db.delete(schema.households).where(eq(schema.households.id, h));
      }
    });

    it("guarda la clave cifrada, devuelve solo su final y no se mezcla entre hogares", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      for (const h of [a, b]) await db.insert(schema.households).values({ id: h, name: `Hogar ${h.slice(0, 4)}` });
      expect(await getAiStatus(a)).toMatchObject({ source: null, model: "claude-sonnet-5-5", last4: null });

      await saveAiSettings(a, "u1", { apiKey: ` ${KEY} `, model: "claude-haiku-5-5" });
      const [row] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.householdId, a));
      expect(row.apiKeyEnc).toBeTruthy();
      expect(row.apiKeyEnc).not.toContain("sk-ant");
      expect(row.apiKeyEnc).not.toContain(KEY.slice(-12));

      const status = await getAiStatus(a);
      expect(status).toEqual({ model: "claude-haiku-5-5", source: "household", last4: "WXYZ", unreadable: false });
      expect(JSON.stringify(status)).not.toContain("x".repeat(10));
      expect(await resolveAiConfig(a)).toEqual({ apiKey: KEY, model: "claude-haiku-5-5" });
      expect(await resolveAiConfig(b)).toBeNull(); // el otro hogar no hereda nada
    });

    it("cambiar solo el modelo conserva la clave; quitarla deja al hogar sin clave (o con la del servidor)", async () => {
      await saveAiSettings(a, "u1", { model: "claude-opus-5-5" });
      expect(await resolveAiConfig(a)).toEqual({ apiKey: KEY, model: "claude-opus-5-5" });

      await saveAiSettings(a, "u1", { clearKey: true });
      expect(await resolveAiConfig(a)).toBeNull();
      process.env.ANTHROPIC_API_KEY = "sk-ant-de-servidor";
      expect(await getAiStatus(a)).toMatchObject({ source: "server", model: "claude-opus-5-5" });
      expect(await resolveAiConfig(a)).toEqual({ apiKey: "sk-ant-de-servidor", model: "claude-opus-5-5" });
    });

    it("rechaza claves y modelos inválidos sin tocar lo guardado", async () => {
      await expect(saveAiSettings(a, "u1", { apiKey: "no-es-clave" })).rejects.toBeInstanceOf(InvalidSettingError);
      await expect(saveAiSettings(a, "u1", { model: "otro-modelo" })).rejects.toBeInstanceOf(InvalidSettingError);
      expect((await getAiStatus(a)).model).toBe("claude-opus-5-5");
    });

    it("si la llave del servidor cambió, la clave guardada se marca como ilegible", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await saveAiSettings(b, "u2", { apiKey: KEY });
      const prev = process.env.SESSION_SECRET;
      process.env.SESSION_SECRET = "otra-llave-distinta";
      expect(await getAiStatus(b)).toMatchObject({ source: null, unreadable: true });
      expect(await resolveAiConfig(b)).toBeNull();
      process.env.SESSION_SECRET = prev;
    });
  });
}
