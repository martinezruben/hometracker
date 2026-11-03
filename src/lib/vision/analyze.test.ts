import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import { consume, resetRateLimits } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/auth/roles";
import { analyzeBoxPhoto, VisionError, type VisionClient } from "./analyze";
import { normalizeItems } from "./schema";

const image = { data: Buffer.from("fake"), mediaType: "image/jpeg" as const };

function fake(over: Partial<Anthropic.Message> & { text?: string } = {}): { client: VisionClient; calls: Anthropic.MessageCreateParamsNonStreaming[] } {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const client: VisionClient = {
    messages: {
      create: async (params) => {
        calls.push(params);
        return {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5-5",
          stop_reason: "end_turn",
          content: [{ type: "text", text: over.text ?? '{"items":[]}' }],
          usage: { input_tokens: 1500, output_tokens: 120 },
          ...over,
        } as unknown as Anthropic.Message;
      },
    },
  };
  return { client, calls };
}

describe("analizar foto de caja", () => {
  it("pide la imagen en base64, con salida estructurada y el modelo por defecto, y devuelve los objetos normalizados", async () => {
    const { client, calls } = fake({
      text: JSON.stringify({
        items: [
          { title: "  bolas   de navidad ", quantity: 12, category: "Navidad", confidence: "alta" },
          { title: "Bolas de Navidad", quantity: 3, category: null, confidence: "media" },
          { title: "Taladro", quantity: 1, category: " Herramientas ", confidence: "alta" },
        ],
      }),
    });
    const r = await analyzeBoxPhoto(image, { client });
    expect(r.items).toEqual([
      { title: "Bolas de navidad", quantity: 15, category: "Navidad", confidence: "media" },
      { title: "Taladro", quantity: 1, category: "Herramientas", confidence: "alta" },
    ]);
    expect(r.usage).toEqual({ input: 1500, output: 120 });
    const p = calls[0];
    expect(p.model).toBe("claude-sonnet-5-5");
    expect(p.output_config?.format?.type).toBe("json_schema");
    const content = p.messages[0].content as Anthropic.ContentBlockParam[];
    expect(content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from("fake").toString("base64") } });
    expect(p).not.toHaveProperty("temperature");
    expect(p).not.toHaveProperty("tool_choice");
  });

  it("si el modelo rechaza, o la respuesta se corta o no es JSON válido, falla con un código claro", async () => {
    await expect(analyzeBoxPhoto(image, { client: fake({ stop_reason: "refusal" }).client })).rejects.toMatchObject({ code: "ai_refused" });
    await expect(analyzeBoxPhoto(image, { client: fake({ stop_reason: "max_tokens" }).client })).rejects.toMatchObject({ code: "ai_bad_response" });
    await expect(analyzeBoxPhoto(image, { client: fake({ text: "no es json" }).client })).rejects.toMatchObject({ code: "ai_bad_response" });
    await expect(analyzeBoxPhoto(image, { client: fake({ text: '{"items":[{"title":"x"}]}' }).client })).rejects.toBeInstanceOf(VisionError);
  });

  it("un error de la API se traduce a ai_unavailable (sin filtrar detalles)", async () => {
    const client: VisionClient = { messages: { create: async () => { throw new Anthropic.APIError(529, undefined, "sobrecargado", new Headers()); } } };
    await expect(analyzeBoxPhoto(image, { client })).rejects.toMatchObject({ code: "ai_unavailable" });
  });

  it("sin clave configurada falla antes de llamar", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(analyzeBoxPhoto(image)).rejects.toMatchObject({ code: "ai_not_configured" });
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
  });
});

describe("normalizar la lista", () => {
  it("limpia, suma duplicados sin importar acentos o mayúsculas, acota cantidades y descarta vacíos", () => {
    const r = normalizeItems([
      { title: "Sartén", quantity: 1, category: "Cocina", confidence: "alta" },
      { title: "sarten", quantity: 2, category: null, confidence: "baja" },
      { title: "   ", quantity: 5, category: null, confidence: "alta" },
      { title: "Libros", quantity: 500, category: "", confidence: "media" },
      { title: "Cinta", quantity: 0, category: null, confidence: "alta" },
      { title: "Raro", quantity: Number.NaN, category: null, confidence: "alta" },
    ]);
    expect(r).toEqual([
      { title: "Sartén", quantity: 3, category: "Cocina", confidence: "baja" },
      { title: "Libros", quantity: 99, category: null, confidence: "media" },
      { title: "Cinta", quantity: 1, category: null, confidence: "alta" },
      { title: "Raro", quantity: 1, category: null, confidence: "alta" },
    ]);
  });
  it("máximo 60 objetos", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ title: `Objeto ${i}`, quantity: 1, category: null, confidence: "alta" as const }));
    expect(normalizeItems(many)).toHaveLength(60);
  });
});

describe("límite de uso", () => {
  beforeEach(resetRateLimits);
  it("bloquea al pasar el límite dentro de la ventana y se libera después", () => {
    for (let i = 0; i < 3; i++) consume("k", 3, 1000, 100 + i);
    expect(() => consume("k", 3, 1000, 200)).toThrow(RateLimitError);
    expect(() => consume("k", 3, 1000, 1150)).not.toThrow(); // ya salieron los primeros
    expect(() => consume("otro", 3, 1000, 200)).not.toThrow(); // claves independientes
  });
});
