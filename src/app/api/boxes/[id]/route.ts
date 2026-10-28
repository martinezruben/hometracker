import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getBoxAccess } from "@/lib/boxes/data";
import { boxUpdate, uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx, min: "viewer" | "member") {
  const user = await requireApiUser();
  const id = uuid.parse((await ctx.params).id);
  const access = await getBoxAccess(user.id, id);
  if (!access) throw new NotFoundError();
  assertRole(access.role, min);
  return access;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    return json({ box: (await load(ctx, "viewer")).box });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { box } = await load(ctx, "member");
    const changes = boxUpdate.parse(await request.json());
    await db.update(schema.boxes).set(changes).where(eq(schema.boxes.id, box.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { box } = await load(ctx, "member");
    await db.update(schema.boxes).set({ deletedAt: new Date() }).where(eq(schema.boxes.id, box.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
