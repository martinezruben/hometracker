import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getListAccess } from "@/lib/lists/data";
import { listUpdate, uuid } from "@/lib/lists/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const user = await requireApiUser();
  const access = await getListAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, "member");
  return access.list;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const list = await load(ctx);
    await db.update(schema.lists).set(listUpdate.parse(await request.json())).where(eq(schema.lists.id, list.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const list = await load(ctx);
    await db.update(schema.lists).set({ deletedAt: new Date() }).where(eq(schema.lists.id, list.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
