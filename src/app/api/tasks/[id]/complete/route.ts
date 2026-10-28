import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { completeTask, getTaskAccess } from "@/lib/tasks/data";
import { taskComplete, uuid } from "@/lib/tasks/schemas";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getTaskAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const { dueAt } = taskComplete.parse(await request.json().catch(() => ({})));
    return json(await completeTask(access.task, new Date(), dueAt));
  } catch (err) {
    return handleError(err);
  }
}
