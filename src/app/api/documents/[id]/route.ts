import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getDocumentAccess, validateLinks } from "@/lib/documents/data";
import { documentUpdate, uuid } from "@/lib/documents/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx, min: "viewer" | "member") {
  const user = await requireApiUser();
  const access = await getDocumentAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, min);
  return access.document;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    return json({ document: await load(ctx, "viewer") });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const doc = await load(ctx, "member");
    const changes = documentUpdate.parse(await request.json());
    if (!(await validateLinks(doc.householdId, changes.providerId, changes.applianceId))) throw new ForbiddenError();
    await db.update(schema.documents).set(changes).where(eq(schema.documents.id, doc.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const doc = await load(ctx, "member");
    // Borrado lógico; el archivo se conserva hasta una limpieza programada.
    await db.update(schema.documents).set({ deletedAt: new Date() }).where(eq(schema.documents.id, doc.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
