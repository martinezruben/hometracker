import { redirect } from "next/navigation";
import { NewApplianceForm } from "@/components/NewApplianceForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function NewAppliancePage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/appliances");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.appliances.new}</h1>
      <NewApplianceForm />
    </section>
  );
}
