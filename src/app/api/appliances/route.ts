import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { applianceCreate } from "@/lib/appliances/schemas";
import { createAppliance, listAppliances } from "@/lib/appliances/data";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household) return json({ appliances: [] });
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    return json({ appliances: await listAppliances(household.id, q) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = applianceCreate.parse(await request.json());
    const appliance = await createAppliance(household.id, user.id, input);
    if (!appliance) throw new ForbiddenError();
    return json({ appliance }, 201);
  } catch (err) {
    return handleError(err);
  }
}
