import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getBoxAccess } from "@/lib/boxes/data";
import { getApplianceAccess } from "@/lib/appliances/data";
import { getListItemAccess } from "@/lib/lists/data";
import { uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";
import { getStorage } from "@/lib/storage";

const MAX_FILE = 5 * 1024 * 1024;
const MAX_THUMB = 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const meta = z.object({
  id: uuid,
  entityType: z.enum(["box", "appliance", "list_item"]), // se ampliará a listas, documentos, etc.
  entityId: uuid,
  caption: z.string().trim().max(300).optional(),
  width: z.coerce.number().int().positive().max(20000).optional(),
  height: z.coerce.number().int().positive().max(20000).optional(),
});

/** Sube una foto (ya comprimida en el cliente) y su miniatura. Idempotente por `id`. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const form = await request.formData();
    const m = meta.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
    const file = form.get("file");
    const thumb = form.get("thumb");
    if (!(file instanceof File) || !ALLOWED.includes(file.type) || file.size > MAX_FILE) {
      return json({ error: "invalid_file" }, 400);
    }
    if (thumb !== null && (!(thumb instanceof File) || !ALLOWED.includes(thumb.type) || thumb.size > MAX_THUMB)) {
      return json({ error: "invalid_file" }, 400);
    }

    const access =
      m.entityType === "box"
        ? await getBoxAccess(user.id, m.entityId).then((a) => a && { role: a.role, householdId: a.box.householdId })
        : m.entityType === "appliance"
          ? await getApplianceAccess(user.id, m.entityId).then((a) => a && { role: a.role, householdId: a.appliance.householdId })
          : await getListItemAccess(user.id, m.entityId).then((a) => a && { role: a.role, householdId: a.item.householdId });
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const householdId = access.householdId;

    const [existing] = await db.select().from(schema.photos).where(eq(schema.photos.id, m.id));
    if (existing) {
      if (existing.householdId !== householdId) throw new ForbiddenError();
      return json({ photo: existing });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storageKey = `${householdId}/${m.id}.${ext}`;
    const thumbKey = thumb ? `${householdId}/${m.id}_t.jpg` : null;
    const storage = getStorage();
    await storage.put(storageKey, Buffer.from(await file.arrayBuffer()), file.type);
    if (thumb instanceof File && thumbKey) {
      await storage.put(thumbKey, Buffer.from(await thumb.arrayBuffer()), thumb.type);
    }

    await db.insert(schema.photos).values({
      id: m.id,
      householdId,
      createdBy: user.id,
      entityType: m.entityType,
      entityId: m.entityId,
      storageKey,
      thumbKey,
      mimeType: file.type,
      sizeBytes: file.size,
      width: m.width ?? null,
      height: m.height ?? null,
      caption: m.caption ?? null,
    });
    const [photo] = await db.select().from(schema.photos).where(eq(schema.photos.id, m.id));
    return json({ photo }, 201);
  } catch (err) {
    return handleError(err);
  }
}
