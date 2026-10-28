import { redirect } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function NewContactPage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/contacts");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.contacts.new}</h1>
      <ContactForm />
    </section>
  );
}
