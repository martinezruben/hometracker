import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { createTask, listTasks } from "@/lib/tasks/data";
import { taskCreate } from "@/lib/tasks/schemas";
import { handleError, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    return json(household ? await listTasks(household.id) : { open: [], done: [] });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = taskCreate.parse(await request.json());
    const task = await createTask(household.id, user.id, {
      ...input,
      notes: input.notes ?? null,
      dueAt: input.dueAt ?? null,
      repeatRule: input.repeatRule ?? null,
      assignedTo: input.assignedTo ?? null,
    });
    if (!task) throw new ForbiddenError();
    return json({ task }, 201);
  } catch (err) {
    return handleError(err);
  }
}
