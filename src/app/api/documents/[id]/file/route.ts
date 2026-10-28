import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getDocumentAccess } from "@/lib/documents/data";
import { DOC_TYPES, MAX_DOC_BYTES, mimeFromKey, uuid } from "@/lib/documents/schemas";
import { handleError, json } from "@/lib/http";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Descarga el archivo; solo miembros del hogar dueño. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getDocumentAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access?.document.fileKey) throw new NotFoundError();
    const file = await getStorage().get(access.document.fileKey);
    if (!file) throw new NotFoundError();
    return new Response(file.body, {
      headers: {
        "content-type": mimeFromKey(access.document.fileKey),
        "content-disposition": "inline",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

/** Adjunta (o reemplaza) el archivo del documento: PDF o imagen, hasta 4 MB. */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getDocumentAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !(file.type in DOC_TYPES)) return json({ error: "invalid_file" }, 400);
    if (file.size > MAX_DOC_BYTES) return json({ error: "too_large" }, 413);

    const { document: doc } = access;
    const key = `${doc.householdId}/docs/${doc.id}-${randomUUID().slice(0, 8)}.${DOC_TYPES[file.type]}`;
    const storage = getStorage();
    await storage.put(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.update(schema.documents).set({ fileKey: key }).where(eq(schema.documents.id, doc.id));
    if (doc.fileKey) await storage.remove(doc.fileKey).catch(() => undefined); // reemplazo: libera el anterior
    return json({ ok: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}
