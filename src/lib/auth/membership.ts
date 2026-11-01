import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertRole, type Role } from "./roles";

export async function getMemberRole(userId: string, householdId: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: schema.householdMembers.role })
    .from(schema.householdMembers)
    .where(
      and(
        eq(schema.householdMembers.userId, userId),
        eq(schema.householdMembers.householdId, householdId),
      ),
    );
  return row?.role ?? null;
}

/** Lanza ForbiddenError si el usuario no es miembro del hogar con al menos el rol pedido. */
export async function requireRole(userId: string, householdId: string, min: Role = "viewer") {
  return assertRole(await getMemberRole(userId, householdId), min);
}

/** Hogar activo: por ahora el primero al que se unió el usuario (una consulta por petición gracias a `cache`). */
export const getActiveHousehold = cache(async (userId: string) => {
  const [row] = await db
    .select({
      id: schema.households.id,
      name: schema.households.name,
      role: schema.householdMembers.role,
    })
    .from(schema.householdMembers)
    .innerJoin(schema.households, eq(schema.households.id, schema.householdMembers.householdId))
    .where(eq(schema.householdMembers.userId, userId))
    .orderBy(asc(schema.householdMembers.createdAt))
    .limit(1);
  return row ?? null;
});
