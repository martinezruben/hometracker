import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getPhotoAccess } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getPhotoAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    // Borrado lógico; el archivo se conserva hasta una limpieza programada.
    await db.update(schema.photos).set({ deletedAt: new Date() }).where(eq(schema.photos.id, access.photo.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
