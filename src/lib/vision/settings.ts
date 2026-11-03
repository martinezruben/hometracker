import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { DEFAULT_AI_MODEL, isAiModel, validApiKey, type AiModelId } from "./models";

export type AiStatus = {
  model: AiModelId;
  /** De dónde sale la clave que se usaría: la del hogar, la del servidor (variable de entorno) o ninguna. */
  source: "household" | "server" | null;
  last4: string | null;
  /** La clave del hogar existe pero no se pudo descifrar (cambió la llave del servidor): hay que volver a guardarla. */
  unreadable: boolean;
};

const envKey = () => process.env.ANTHROPIC_API_KEY?.trim() || null;

async function row(householdId: string) {
  const [r] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.householdId, householdId));
  return r ?? null;
}

/** Estado para mostrar en Ajustes: nunca incluye la clave completa. */
export async function getAiStatus(householdId: string): Promise<AiStatus> {
  const r = await row(householdId);
  const model = r && isAiModel(r.model) ? r.model : isAiModel(process.env.AI_VISION_MODEL) ? process.env.AI_VISION_MODEL : DEFAULT_AI_MODEL;
  if (r?.apiKeyEnc) {
    const readable = decryptSecret(r.apiKeyEnc) !== null;
    if (readable) return { model, source: "household", last4: r.apiKeyLast4, unreadable: false };
    return { model, source: envKey() ? "server" : null, last4: null, unreadable: true };
  }
  return { model, source: envKey() ? "server" : null, last4: null, unreadable: false };
}

/** Clave y modelo que usará el análisis de este hogar, o null si no hay clave configurada. */
export async function resolveAiConfig(householdId: string): Promise<{ apiKey: string; model: AiModelId } | null> {
  const r = await row(householdId);
  const status = await getAiStatus(householdId);
  const apiKey = (r?.apiKeyEnc && decryptSecret(r.apiKeyEnc)) || envKey();
  return apiKey ? { apiKey, model: status.model } : null;
}

export class InvalidSettingError extends Error {
  constructor(readonly field: "apiKey" | "model") {
    super(`Valor inválido: ${field}`);
    this.name = "InvalidSettingError";
  }
}

/** Guarda lo que venga (clave y/o modelo); `clearKey` borra la clave del hogar. La clave se guarda cifrada. */
export async function saveAiSettings(householdId: string, userId: string, input: { apiKey?: string; model?: string; clearKey?: boolean }) {
  const set: Partial<typeof schema.aiSettings.$inferInsert> = { updatedBy: userId };
  if (input.model !== undefined) {
    if (!isAiModel(input.model)) throw new InvalidSettingError("model");
    set.model = input.model;
  }
  if (input.clearKey) {
    set.apiKeyEnc = null;
    set.apiKeyLast4 = null;
  } else if (input.apiKey !== undefined) {
    const key = validApiKey(input.apiKey);
    if (!key) throw new InvalidSettingError("apiKey");
    set.apiKeyEnc = encryptSecret(key);
    set.apiKeyLast4 = key.slice(-4);
  }
  await db.insert(schema.aiSettings).values({ householdId, ...set }).onDuplicateKeyUpdate({ set });
}
