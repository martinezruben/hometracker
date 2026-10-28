import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getContactAccess } from "@/lib/contacts/data";
import { contactUpdate, uuid } from "@/lib/contacts/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx, min: "viewer" | "member") {
  const user = await requireApiUser();
  const access = await getContactAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, min);
  return access.contact;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    return json({ contact: await load(ctx, "viewer") });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const contact = await load(ctx, "member");
    const { email, ...rest } = contactUpdate.parse(await request.json());
    await db
      .update(schema.contacts)
      .set({ ...rest, ...(email !== undefined ? { email: email || null } : {}) })
      .where(eq(schema.contacts.id, contact.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const contact = await load(ctx, "member");
    await db.update(schema.contacts).set({ deletedAt: new Date() }).where(eq(schema.contacts.id, contact.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
