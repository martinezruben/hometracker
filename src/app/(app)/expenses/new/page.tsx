import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listContacts } from "@/lib/contacts/data";
import { es } from "@/lib/i18n/es";
import { FormShell } from "@/components/ui/FormShell";

export default async function NewExpensePage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/expenses");
  const contacts = await listContacts(household.id);
  return (
    <FormShell title={es.expenses.new} backHref="/expenses">
        <ExpenseForm providers={contacts.map((c) => ({ id: c.id, name: c.name }))} />
    </FormShell>
  );
}
