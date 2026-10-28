import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateOtp, hashOtp, normalizeEmail, safeEqualHex } from "./crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;

export class RateLimitError extends Error {
  constructor() {
    super("Demasiados intentos. Intenta de nuevo más tarde.");
    this.name = "RateLimitError";
  }
}

/** Crea un código nuevo. Devuelve el código en claro para enviarlo por correo. */
export async function createOtp(rawEmail: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.email, email), gt(schema.otpCodes.createdAt, since)));
  if (Number(n) >= OTP_MAX_PER_HOUR) throw new RateLimitError();

  const code = generateOtp();
  await db.insert(schema.otpCodes).values({
    id: randomUUID(),
    email,
    codeHash: hashOtp(email, code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
  });
  return { email, code };
}

/** Verifica el código; devuelve el usuario (creándolo si es nuevo) o null si es inválido. */
export async function verifyOtp(rawEmail: string, code: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const [row] = await db
    .select()
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.email, email),
        isNull(schema.otpCodes.consumedAt),
        gt(schema.otpCodes.expiresAt, now),
        lt(schema.otpCodes.attempts, OTP_MAX_ATTEMPTS),
      ),
    )
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!row) return null;

  // Cuenta el intento de forma atómica antes de comparar (evita fuerza bruta en paralelo).
  const [bump] = await db
    .update(schema.otpCodes)
    .set({ attempts: sql`${schema.otpCodes.attempts} + 1` })
    .where(
      and(
        eq(schema.otpCodes.id, row.id),
        isNull(schema.otpCodes.consumedAt),
        lt(schema.otpCodes.attempts, OTP_MAX_ATTEMPTS),
      ),
    );
  if (bump.affectedRows !== 1) return null;
  if (!/^\d{6}$/.test(code) || !safeEqualHex(row.codeHash, hashOtp(email, code))) return null;

  const [consumed] = await db
    .update(schema.otpCodes)
    .set({ consumedAt: now })
    .where(and(eq(schema.otpCodes.id, row.id), isNull(schema.otpCodes.consumedAt)));
  if (consumed.affectedRows !== 1) return null;

  await db
    .insert(schema.users)
    .values({ id: randomUUID(), email })
    .onDuplicateKeyUpdate({ set: { email } });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  return user;
}
