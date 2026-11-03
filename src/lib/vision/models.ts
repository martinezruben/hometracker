/** Modelos que se pueden elegir para detectar objetos (lista cerrada: nunca se acepta un id libre). */
export const AI_MODELS = [
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", hint: "Equilibrado (recomendado)", price: "US$2 / US$10 por millón de tokens" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", hint: "Económico y rápido; falla más con cajas llenas", price: "US$0,10 / US$0,50 por millón de tokens" },
  { id: "claude-opus-5-5", name: "Opus 5.5", hint: "Más preciso con objetos pequeños o apilados", price: "US$4 / US$20 por millón de tokens" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_AI_MODEL: AiModelId = "claude-sonnet-5-5";
export const isAiModel = (v: unknown): v is AiModelId => AI_MODELS.some((m) => m.id === v);

/** Una clave de Anthropic empieza por `sk-ant-` y no lleva espacios. */
export function validApiKey(raw: string): string | null {
  const key = raw.trim();
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(key) ? key : null;
}
