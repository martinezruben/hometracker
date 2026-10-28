import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getStepAccess } from "@/lib/tasks/data";
import { stepUpdate, uuid } from "@/lib/tasks/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const user = await requireApiUser();
  const access = await getStepAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, "member");
  return access.step;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const step = await load(ctx);
    await db.update(schema.taskSteps).set(stepUpdate.parse(await request.json())).where(eq(schema.taskSteps.id, step.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const step = await load(ctx);
    await db.update(schema.taskSteps).set({ deletedAt: new Date() }).where(eq(schema.taskSteps.id, step.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
