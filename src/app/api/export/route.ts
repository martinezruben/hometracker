import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { exportHousehold } from "@/lib/export/data";
import { handleError } from "@/lib/http";

/** Descarga de todos los datos del hogar en JSON. Solo administradores. */
export async function GET() {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "admin")) throw new ForbiddenError();
    const data = await exportHousehold(household.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="hometracker-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
