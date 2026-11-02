import { redirect } from "next/navigation";
import { NewApplianceForm } from "@/components/NewApplianceForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";
import { FormShell } from "@/components/ui/FormShell";

export default async function NewAppliancePage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/appliances");
  return (
    <FormShell title={es.appliances.new} backHref="/appliances">
        <NewApplianceForm />
    </FormShell>
  );
}
