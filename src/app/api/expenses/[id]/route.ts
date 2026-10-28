import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { assertRole, ForbiddenError, NotFoundError } from "@/lib/auth/roles";
import { getExpenseAccess, validateProvider } from "@/lib/expenses/data";
import { expenseUpdate, uuid } from "@/lib/expenses/schemas";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx, min: "viewer" | "member") {
  const user = await requireApiUser();
  const access = await getExpenseAccess(user.id, uuid.parse((await ctx.params).id));
  if (!access) throw new NotFoundError();
  assertRole(access.role, min);
  return access.expense;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    return json({ expense: await load(ctx, "viewer") });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const expense = await load(ctx, "member");
    const changes = expenseUpdate.parse(await request.json());
    if (!(await validateProvider(expense.householdId, changes.providerId))) throw new ForbiddenError();
    await db.update(schema.expenses).set(changes).where(eq(schema.expenses.id, expense.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const expense = await load(ctx, "member");
    await db.update(schema.expenses).set({ deletedAt: new Date() }).where(eq(schema.expenses.id, expense.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
