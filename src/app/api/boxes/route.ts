import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { boxCreate } from "@/lib/boxes/schemas";
import { createBox, listBoxes } from "@/lib/boxes/data";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household) return json({ boxes: [] });
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    return json({ boxes: await listBoxes(household.id, q) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = boxCreate.parse(await request.json());
    const box = await createBox(household.id, user.id, input);
    if (!box) throw new ForbiddenError();
    return json({ box }, 201);
  } catch (err) {
    return handleError(err);
  }
}
