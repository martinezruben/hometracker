import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getApplianceAccess } from "@/lib/appliances/data";
import { applianceUpdate, uuid } from "@/lib/appliances/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx, min: "viewer" | "member") {
  const user = await requireApiUser();
  const access = await getApplianceAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, min);
  return access;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    return json({ appliance: (await load(ctx, "viewer")).appliance });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { appliance } = await load(ctx, "member");
    const changes = applianceUpdate.parse(await request.json());
    await db.update(schema.appliances).set(changes).where(eq(schema.appliances.id, appliance.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { appliance } = await load(ctx, "member");
    await db.update(schema.appliances).set({ deletedAt: new Date() }).where(eq(schema.appliances.id, appliance.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
