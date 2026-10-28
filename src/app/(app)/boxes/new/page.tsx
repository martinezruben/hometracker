import { redirect } from "next/navigation";
import { NewBoxForm } from "@/components/NewBoxForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function NewBoxPage() {
  const { household } = await requireActiveHousehold();
  if (household.role === "viewer") redirect("/boxes");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.boxes.new}</h1>
      <NewBoxForm />
    </section>
  );
}
