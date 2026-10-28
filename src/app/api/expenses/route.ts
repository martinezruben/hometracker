import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { createExpense, monthSummary } from "@/lib/expenses/data";
import { currentMonth, MONTH_RE } from "@/lib/expenses/month";
import { expenseCreate } from "@/lib/expenses/schemas";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    const m = new URL(request.url).searchParams.get("month") ?? "";
    const month = MONTH_RE.test(m) ? m : currentMonth();
    return json(household ? await monthSummary(household.id, month) : { items: [], byCategory: [], total: 0 });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = expenseCreate.parse(await request.json());
    const expense = await createExpense(household.id, user.id, {
      ...input,
      category: input.category || null,
      providerId: input.providerId ?? null,
      notes: input.notes ?? null,
    });
    if (!expense) throw new ForbiddenError();
    return json({ expense }, 201);
  } catch (err) {
    return handleError(err);
  }
}
