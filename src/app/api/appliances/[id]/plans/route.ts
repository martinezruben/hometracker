import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getApplianceAccess } from "@/lib/appliances/data";
import { planCreate, uuid } from "@/lib/appliances/schemas";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const applianceId = uuid.parse((await ctx.params).id);
    const access = await getApplianceAccess(user.id, applianceId);
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");

    const input = planCreate.parse(await request.json());
    const id = input.id ?? randomUUID();
    await db
      .insert(schema.maintenancePlans)
      .values({
        id,
        householdId: access.appliance.householdId,
        createdBy: user.id,
        applianceId,
        title: input.title,
        intervalValue: input.intervalValue,
        intervalUnit: input.intervalUnit,
        nextDue: input.nextDue,
        remindDaysBefore: input.remindDaysBefore,
        notes: input.notes ?? null,
      })
      .onDuplicateKeyUpdate({ set: { id } });
    const [plan] = await db.select().from(schema.maintenancePlans).where(eq(schema.maintenancePlans.id, id));
    if (plan.applianceId !== applianceId || plan.householdId !== access.appliance.householdId) {
      throw new ForbiddenError();
    }
    return json({ plan }, 201);
  } catch (err) {
    return handleError(err);
  }
}
