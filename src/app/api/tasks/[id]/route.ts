import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getTaskAccess, isMember } from "@/lib/tasks/data";
import { taskUpdate, uuid } from "@/lib/tasks/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const user = await requireApiUser();
  const access = await getTaskAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, "member");
  return access.task;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const task = await load(ctx);
    const { reopen, ...changes } = taskUpdate.parse(await request.json());
    if (changes.assignedTo && !(await isMember(task.householdId, changes.assignedTo))) throw new ForbiddenError();
    await db
      .update(schema.tasks)
      .set({ ...changes, ...(reopen ? { doneAt: null } : {}) })
      .where(eq(schema.tasks.id, task.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const task = await load(ctx);
    await db.update(schema.tasks).set({ deletedAt: new Date() }).where(eq(schema.tasks.id, task.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
