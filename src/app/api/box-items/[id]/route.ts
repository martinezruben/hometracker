import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getItemAccess } from "@/lib/boxes/data";
import { itemUpdate, uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const user = await requireApiUser();
  const access = await getItemAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, "member");
  return access.item;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const item = await load(ctx);
    const changes = itemUpdate.parse(await request.json());
    await db.update(schema.boxItems).set(changes).where(eq(schema.boxItems.id, item.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const item = await load(ctx);
    await db.update(schema.boxItems).set({ deletedAt: new Date() }).where(eq(schema.boxItems.id, item.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
