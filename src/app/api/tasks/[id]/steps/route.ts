import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { createStep, getTaskAccess, listSteps } from "@/lib/tasks/data";
import { stepCreate, uuid } from "@/lib/tasks/schemas";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getTaskAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const step = await createStep(access.task, user.id, stepCreate.parse(await request.json()));
    if (!step) throw new ForbiddenError();
    return json({ step }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getTaskAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    return json({ steps: await listSteps(access.task.householdId, access.task.id) });
  } catch (err) {
    return handleError(err);
  }
}
