import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getApplianceAccess } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { DOC_TYPES, MAX_DOC_BYTES } from "@/lib/documents/schemas";
import { handleError, json } from "@/lib/http";
import { getStorage } from "@/lib/storage";

/** Agrega una factura al equipo (PDF o imagen, hasta 4 MB por archivo). Se pueden subir varias, una por petición. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getApplianceAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !(file.type in DOC_TYPES) || file.size === 0) return json({ error: "invalid_file" }, 400);
    if (file.size > MAX_DOC_BYTES) return json({ error: "too_large" }, 413);

    const { appliance } = access;
    const id = randomUUID();
    const key = `${appliance.householdId}/invoices/${appliance.id}-${id.slice(0, 8)}.${DOC_TYPES[file.type]}`;
    await getStorage().put(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.insert(schema.applianceInvoices).values({
      id,
      householdId: appliance.householdId,
      applianceId: appliance.id,
      createdBy: user.id,
      fileKey: key,
      mime: file.type,
      size: file.size,
    });
    return json({ id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
