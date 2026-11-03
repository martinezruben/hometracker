import { z } from "zod";

export const CONFIDENCE = ["alta", "media", "baja"] as const;

/** Lo que el modelo debe devolver (se valida de nuevo aquí: el esquema JSON no impone longitudes ni rangos). */
export const detectedResponse = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      quantity: z.number(),
      category: z.string().nullable(),
      confidence: z.enum(CONFIDENCE),
    }),
  ),
});

export type DetectedItem = { title: string; quantity: number; category: string | null; confidence: (typeof CONFIDENCE)[number] };

/** Esquema JSON para `output_config.format` (salida estructurada). */
export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          quantity: { type: "integer" },
          category: { type: ["string", "null"] },
          confidence: { type: "string", enum: [...CONFIDENCE] },
        },
        required: ["title", "quantity", "category", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

export const MAX_ITEMS = 60;
const MAX_TITLE = 80;
const MAX_CATEGORY = 40;
const MAX_QUANTITY = 99;

const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();

const rank = { alta: 2, media: 1, baja: 0 } as const;

/**
 * Deja la lista lista para guardar: espacios limpios, primera letra en mayúscula, cantidad entre 1 y 99,
 * duplicados (sin acentos ni mayúsculas) sumados, y como máximo `MAX_ITEMS` objetos.
 */
export function normalizeItems(raw: DetectedItem[]): DetectedItem[] {
  const byKey = new Map<string, DetectedItem>();
  for (const r of raw) {
    const clean = r.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE).trim();
    const k = key(clean);
    if (!k) continue;
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number.isFinite(r.quantity) ? r.quantity : 1)));
    const category = r.category?.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY) || null;
    const title = clean.charAt(0).toUpperCase() + clean.slice(1);
    const prev = byKey.get(k);
    if (prev) {
      prev.quantity = Math.min(MAX_QUANTITY, prev.quantity + quantity);
      prev.category ??= category;
      if (rank[r.confidence] < rank[prev.confidence]) prev.confidence = r.confidence; // la menos segura manda
    } else {
      byKey.set(k, { title, quantity, category, confidence: r.confidence });
    }
  }
  return [...byKey.values()].slice(0, MAX_ITEMS);
}
