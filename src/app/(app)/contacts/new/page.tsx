import { redirect } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";
import { FormShell } from "@/components/ui/FormShell";

export default async function NewContactPage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/contacts");
  return (
    <FormShell title={es.contacts.new} backHref="/contacts">
        <ContactForm />
    </FormShell>
  );
}
