import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getInvoiceAccess } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { handleError, json } from "@/lib/http";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Sirve el archivo de la factura solo a miembros del hogar. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getInvoiceAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    const file = await getStorage().get(access.invoice.fileKey);
    if (!file) throw new NotFoundError();
    return new Response(file.body, {
      headers: {
        "content-type": access.invoice.mime,
        "content-disposition": "inline",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

/** Borrado lógico (el archivo se conserva en el storage). */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getInvoiceAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    await db.update(schema.applianceInvoices).set({ deletedAt: new Date() }).where(eq(schema.applianceInvoices.id, access.invoice.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
