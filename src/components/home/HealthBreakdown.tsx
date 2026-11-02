import type { HealthFactor } from "@/lib/home/health";
import { HealthFactors } from "@/components/home/HealthFactors";
import { HouseIllustration } from "@/components/home/HouseIllustration";

/** Qué influye en el puntaje de salud, con la casa en alambre al lado. */
export function HealthBreakdown({ factors }: { factors: HealthFactor[] }) {
  return (
    <section className="card flex items-center gap-2 overflow-hidden p-5">
      <div className="min-w-0 flex-1">
        <HealthFactors factors={factors} bare />
      </div>
      <HouseIllustration className="-mr-4 w-[38%] max-w-[150px] shrink-0" />
    </section>
  );
}
