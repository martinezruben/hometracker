import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { DOC_TYPES, MAX_DOC_BYTES, mimeFromKey } from "@/lib/documents/schemas";
import { getExpenseAccess } from "@/lib/expenses/data";
import { uuid } from "@/lib/expenses/schemas";
import { handleError, json } from "@/lib/http";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getExpenseAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access?.expense.receiptKey) throw new NotFoundError();
    const file = await getStorage().get(access.expense.receiptKey);
    if (!file) throw new NotFoundError();
    return new Response(file.body, {
      headers: {
        "content-type": mimeFromKey(access.expense.receiptKey),
        "content-disposition": "inline",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

/** Adjunta (o reemplaza) el recibo: PDF o imagen, hasta 4 MB. */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const access = await getExpenseAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !(file.type in DOC_TYPES)) return json({ error: "invalid_file" }, 400);
    if (file.size > MAX_DOC_BYTES) return json({ error: "too_large" }, 413);

    const { expense } = access;
    const key = `${expense.householdId}/receipts/${expense.id}-${randomUUID().slice(0, 8)}.${DOC_TYPES[file.type]}`;
    const storage = getStorage();
    await storage.put(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.update(schema.expenses).set({ receiptKey: key }).where(eq(schema.expenses.id, expense.id));
    if (expense.receiptKey) await storage.remove(expense.receiptKey).catch(() => undefined);
    return json({ ok: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}
