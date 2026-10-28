import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeEmail } from "./crypto";
import { RateLimitError } from "./otp";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export class EmailTakenError extends Error {
  constructor() {
    super("Ese correo ya tiene una cuenta.");
    this.name = "EmailTakenError";
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Crea una cuenta nueva. Falla si el correo ya existe (no se reclaman cuentas ajenas). */
export async function registerUser(rawEmail: string, password: string, name?: string) {
  const email = normalizeEmail(rawEmail);
  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  try {
    await db.insert(schema.users).values({ id, email, passwordHash, name: name?.trim() || null });
  } catch (err) {
    if ((err as { code?: string; cause?: { code?: string } }).code === "ER_DUP_ENTRY" ||
        (err as { cause?: { code?: string } }).cause?.code === "ER_DUP_ENTRY") throw new EmailTakenError();
    throw err;
  }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

/** Verifica correo y contraseña; devuelve el usuario o null. Bloquea 15 min tras 5 fallos seguidos. */
export async function authenticate(rawEmail: string, password: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user || !user.passwordHash) {
    // Gasta el mismo tiempo para no revelar si el correo existe.
    await hashPassword(password);
    return null;
  }
  if (user.lockedUntil && user.lockedUntil > now) throw new RateLimitError();

  if (await verifyPassword(password, user.passwordHash)) {
    if (user.failedLogins > 0 || user.lockedUntil) {
      await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
    }
    return user;
  }
  // Incremento atómico y, al llegar al máximo, bloqueo temporal.
  await db
    .update(schema.users)
    .set({ failedLogins: sql`${schema.users.failedLogins} + 1` })
    .where(eq(schema.users.id, user.id));
  await db
    .update(schema.users)
    .set({ lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) })
    .where(and(eq(schema.users.id, user.id), gte(schema.users.failedLogins, LOGIN_MAX_FAILURES)));
  return null;
}
