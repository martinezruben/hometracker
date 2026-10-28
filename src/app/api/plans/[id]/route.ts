import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getPlanAccess } from "@/lib/appliances/data";
import { planUpdate, uuid } from "@/lib/appliances/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const user = await requireApiUser();
  const access = await getPlanAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, "member");
  return access.plan;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const plan = await load(ctx);
    const changes = planUpdate.parse(await request.json());
    await db.update(schema.maintenancePlans).set(changes).where(eq(schema.maintenancePlans.id, plan.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const plan = await load(ctx);
    await db.update(schema.maintenancePlans).set({ deletedAt: new Date() }).where(eq(schema.maintenancePlans.id, plan.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
