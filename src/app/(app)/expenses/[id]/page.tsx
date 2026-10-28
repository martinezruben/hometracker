import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { listContacts } from "@/lib/contacts/data";
import { getExpenseAccess } from "@/lib/expenses/data";
import { uuid } from "@/lib/expenses/schemas";
import { formatDate, formatMoney, toDateInput } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { ExpenseActions } from "@/components/ExpenseActions";
import { linkBtnCls } from "@/components/ui";

const t = es.expenses;

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getExpenseAccess(user.id, parsed.data);
  if (!access) return <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noAccess}</p>;
  const { expense: e, role } = access;
  const contacts = await listContacts(e.householdId);
  const provider = contacts.find((c) => c.id === e.providerId);
  return (
    <section className="space-y-4">
      <Link href="/expenses" className={linkBtnCls}>← {t.back}</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{e.title}</h1>
        <p className="text-3xl font-bold">{formatMoney(e.amount)}</p>
        <p className="text-muted">{formatDate(e.spentAt)}{e.category && ` · ${e.category}`}</p>
        {provider && (
          <p className="text-sm">
            {t.providerLabel}: <Link className="text-primary underline" href={`/contacts/${provider.id}`}>{provider.name}</Link>
          </p>
        )}
        {e.notes && <p className="whitespace-pre-line text-sm">{e.notes}</p>}
      </header>
      <ExpenseActions
        id={e.id}
        hasReceipt={!!e.receiptKey}
        canEdit={role !== "viewer"}
        providers={contacts.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          title: e.title,
          amount: String(e.amount),
          spentAt: toDateInput(e.spentAt),
          category: e.category ?? "",
          providerId: e.providerId ?? "",
          notes: e.notes ?? "",
        }}
      />
    </section>
  );
}
