import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getBoxAccess, touchBox } from "@/lib/boxes/data";
import { itemCreate, uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const boxId = uuid.parse((await ctx.params).id);
    const access = await getBoxAccess(user.id, boxId);
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");

    const input = itemCreate.parse(await request.json());
    const id = input.id ?? randomUUID();
    await db
      .insert(schema.boxItems)
      .values({
        id,
        householdId: access.box.householdId,
        boxId,
        createdBy: user.id,
        title: input.title,
        quantity: input.quantity,
        category: input.category || null,
        notes: input.notes ?? null,
      })
      .onDuplicateKeyUpdate({ set: { id } });
    const [item] = await db.select().from(schema.boxItems).where(eq(schema.boxItems.id, id));
    if (item.boxId !== boxId || item.householdId !== access.box.householdId) throw new ForbiddenError();
    await touchBox(boxId);
    return json({ item }, 201);
  } catch (err) {
    return handleError(err);
  }
}
