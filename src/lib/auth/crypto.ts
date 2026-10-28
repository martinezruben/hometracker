import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Token opaco para cookies de sesión e invitaciones. */
export const randomToken = () => randomBytes(32).toString("base64url");

/** Código numérico de 6 dígitos (con ceros a la izquierda). */
export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Falta SESSION_SECRET");
  return "dev-secret-no-usar-en-produccion";
}

/** HMAC del código OTP ligado al correo: un hash filtrado no se puede reutilizar en otro correo. */
export const hashOtp = (email: string, code: string) =>
  createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");

export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
