import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { PREF_DEFAULTS, PREF_TYPES, type PrefType } from "./prefs";

export async function getPrefs(userId: string): Promise<Record<PrefType, boolean>> {
  const rows = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, userId));
  const result = { ...PREF_DEFAULTS };
  for (const r of rows) if (PREF_TYPES.includes(r.type)) result[r.type] = r.enabled;
  return result;
}

export async function setPref(userId: string, type: PrefType, enabled: boolean) {
  await db
    .insert(schema.notificationPrefs)
    .values({ userId, type, enabled })
    .onDuplicateKeyUpdate({ set: { enabled } });
}

/** Preferencias guardadas de varias personas: userId → (tipo → activo). */
export async function loadPrefs(userIds: string[]): Promise<Map<string, Map<string, boolean>>> {
  const result = new Map<string, Map<string, boolean>>();
  if (!userIds.length) return result;
  const rows = await db.select().from(schema.notificationPrefs).where(inArray(schema.notificationPrefs.userId, userIds));
  for (const r of rows) {
    if (!result.has(r.userId)) result.set(r.userId, new Map());
    result.get(r.userId)!.set(r.type, r.enabled);
  }
  return result;
}
