import { redirect } from "next/navigation";
import { DocumentForm } from "@/components/DocumentForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listAppliances } from "@/lib/appliances/data";
import { listContacts } from "@/lib/contacts/data";
import { es } from "@/lib/i18n/es";
import { FormShell } from "@/components/ui/FormShell";

export default async function NewDocumentPage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/documents");
  const [contacts, appliances] = await Promise.all([listContacts(household.id), listAppliances(household.id)]);
  return (
    <FormShell title={es.documents.new} backHref="/documents">
        <DocumentForm
          providers={contacts.map((c) => ({ id: c.id, name: c.name }))}
          appliances={appliances.map((a) => ({ id: a.id, name: a.name }))}
        />
    </FormShell>
  );
}
