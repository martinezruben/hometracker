import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico (AES-256-GCM) para guardar secretos en la base de datos (p. ej. la clave de IA de un hogar).
 * La llave se deriva de `SETTINGS_SECRET` o, si no existe, de `SESSION_SECRET` (HKDF con un contexto fijo).
 * Si esa llave cambia, lo cifrado antes ya no se puede leer: `decryptSecret` devuelve null y hay que volver a guardarlo.
 */
function key() {
  const secret = process.env.SETTINGS_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta SESSION_SECRET (o SETTINGS_SECRET)");
    return Buffer.from(hkdfSync("sha256", "dev-secret-no-usar-en-produccion", "", "hometracker:secret-box", 32));
  }
  return Buffer.from(hkdfSync("sha256", secret, "", "hometracker:secret-box", 32));
}

/** Devuelve `v1.<iv>.<tag>.<texto cifrado>` en base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(packed: string): string | null {
  try {
    const [v, iv, tag, data] = packed.split(".");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null; // llave distinta, dato alterado o formato inválido
  }
}
