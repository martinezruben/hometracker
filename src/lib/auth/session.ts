import "server-only";
import { cache } from "react";
import { and, asc, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema } from "@/db";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "ht_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_MS);
  const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db
    .insert(schema.sessions)
    .values({ id: sha256(token), userId, userAgent: ua, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Usuario de la sesión; `cache` evita repetir la consulta dentro de la misma petición (layout + página). */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())));
  return row ?? null;
});

/**
 * Usuario y hogar activo (el primero al que se unió) en UNA consulta: es lo que necesita cada pantalla de la app.
 * `cache` lo comparte entre el layout y la página dentro de la misma petición.
 */
export const getSessionContext = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { users, sessions, householdMembers, households } = schema;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      householdId: households.id,
      householdName: households.name,
      role: householdMembers.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(householdMembers, eq(householdMembers.userId, users.id))
    .leftJoin(households, eq(households.id, householdMembers.householdId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .orderBy(asc(householdMembers.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    user: { id: row.id, email: row.email, name: row.name },
    household: row.householdId ? { id: row.householdId, name: row.householdName!, role: row.role! } : null,
  };
});

/** Id (hash) de la sesión actual, para conservarla al cerrar las demás. */
export async function currentSessionId() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? sha256(token) : null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}
