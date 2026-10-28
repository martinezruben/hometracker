import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import type { Role } from "@/lib/auth/roles";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createHousehold(userId: string, name: string) {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.households).values({ id, name, createdBy: userId });
    await tx
      .insert(schema.householdMembers)
      .values({ householdId: id, userId, role: "admin" });
  });
  return id;
}

/** Devuelve el token en claro (solo se muestra una vez); en BD queda su hash. */
export async function createInvitation(
  householdId: string,
  createdBy: string,
  role: Role,
  email?: string,
) {
  const token = randomToken();
  await db.insert(schema.invitations).values({
    id: randomUUID(),
    householdId,
    tokenHash: sha256(token),
    role,
    email: email?.toLowerCase() ?? null,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    createdBy,
  });
  return token;
}

/** Acepta una invitación; devuelve el hogar o null si es inválida, vencida o ya usada. */
export async function acceptInvitation(user: { id: string; email: string }, token: string) {
  return db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.tokenHash, sha256(token)),
          isNull(schema.invitations.acceptedAt),
          gt(schema.invitations.expiresAt, new Date()),
        ),
      );
    if (!inv) return null;
    if (inv.email && inv.email !== user.email.toLowerCase()) return null;

    const [claimed] = await tx
      .update(schema.invitations)
      .set({ acceptedAt: new Date() })
      .where(and(eq(schema.invitations.id, inv.id), isNull(schema.invitations.acceptedAt)));
    if (claimed.affectedRows !== 1) return null;

    await tx
      .insert(schema.householdMembers)
      .values({ householdId: inv.householdId, userId: user.id, role: inv.role })
      .onDuplicateKeyUpdate({ set: { userId: user.id } }); // ya era miembro: conserva su rol
    return inv.householdId;
  });
}
