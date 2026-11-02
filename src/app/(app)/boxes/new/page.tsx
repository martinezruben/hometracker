import { redirect } from "next/navigation";
import { NewBoxForm } from "@/components/NewBoxForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";
import { FormShell } from "@/components/ui/FormShell";

export default async function NewBoxPage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/boxes");
  return (
    <FormShell title={es.boxes.new} backHref="/boxes">
        <NewBoxForm />
    </FormShell>
  );
}
