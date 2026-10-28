import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { completePlan, getPlanAccess } from "@/lib/appliances/data";
import { planComplete, uuid } from "@/lib/appliances/schemas";
import { handleError, json } from "@/lib/http";

/** Marca el mantenimiento como hecho y reprograma el siguiente. Idempotente por `id` del registro. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getPlanAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const input = planComplete.parse(await request.json());
    const result = await completePlan(access.plan, user.id, input);
    if (!result) return json({ error: "conflict" }, 409);
    return json({ log: result.log }, result.repeated ? 200 : 201);
  } catch (err) {
    return handleError(err);
  }
}
