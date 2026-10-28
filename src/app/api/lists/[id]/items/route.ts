import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getListAccess } from "@/lib/lists/data";
import { itemCreate, uuid } from "@/lib/lists/schemas";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const listId = uuid.parse((await ctx.params).id);
    const access = await getListAccess(user.id, listId);
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const input = itemCreate.parse(await request.json());
    const id = input.id ?? randomUUID();
    await db
      .insert(schema.listItems)
      .values({
        id,
        householdId: access.list.householdId,
        listId,
        createdBy: user.id,
        title: input.title,
        quantity: input.quantity ?? null,
        price: input.price ?? null,
        notes: input.notes ?? null,
        status: access.list.type === "sale" ? "available" : "pending",
      })
      .onDuplicateKeyUpdate({ set: { id } });
    const [item] = await db.select().from(schema.listItems).where(eq(schema.listItems.id, id));
    if (item.listId !== listId || item.householdId !== access.list.householdId) throw new ForbiddenError();
    return json({ item }, 201);
  } catch (err) {
    return handleError(err);
  }
}
