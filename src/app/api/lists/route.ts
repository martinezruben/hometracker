import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { createList, listLists } from "@/lib/lists/data";
import { listCreate } from "@/lib/lists/schemas";
import { handleError, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    return json({ lists: household ? await listLists(household.id) : [] });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const list = await createList(household.id, user.id, listCreate.parse(await request.json()));
    if (!list) throw new ForbiddenError();
    return json({ list }, 201);
  } catch (err) {
    return handleError(err);
  }
}
