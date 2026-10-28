import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { requireUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { safeNext } from "@/lib/safe-next";
import { es } from "@/lib/i18n/es";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  const user = await requireUser();
  if (await getActiveHousehold(user.id)) redirect(next);
  return (
    <>
      <h1 className="text-2xl font-bold">{es.onboarding.title}</h1>
      <OnboardingForm next={next} />
    </>
  );
}
