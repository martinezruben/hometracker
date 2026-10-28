import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listContacts } from "@/lib/contacts/data";
import { es } from "@/lib/i18n/es";

export default async function NewExpensePage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/expenses");
  const contacts = await listContacts(household.id);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.expenses.new}</h1>
      <ExpenseForm providers={contacts.map((c) => ({ id: c.id, name: c.name }))} />
    </section>
  );
}
