import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getListAccess } from "@/lib/lists/data";
import { uuid } from "@/lib/lists/schemas";
import { handleError, json } from "@/lib/http";

/** Quita de la lista los elementos ya marcados (borrado lógico). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getListAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    await db
      .update(schema.listItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(schema.listItems.listId, access.list.id),
          eq(schema.listItems.householdId, access.list.householdId),
          eq(schema.listItems.checked, true),
          isNull(schema.listItems.deletedAt),
        ),
      );
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
