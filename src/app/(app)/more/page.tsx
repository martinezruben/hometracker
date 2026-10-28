import Link from "next/link";
import { InviteForm } from "@/components/InviteForm";
import { LogoutButton } from "@/components/LogoutButton";
import { PushSettings } from "@/components/PushSettings";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function MorePage() {
  const { user, household } = await requireActiveHousehold();
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{es.more.title}</h1>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        <li>
          <Link href="/tasks" className="flex min-h-14 items-center justify-between p-4">
            <span>{es.tasks.title}</span>
            <span aria-hidden>›</span>
          </Link>
        </li>
        {es.more.items.map((item) => (
          <li key={item} className="flex min-h-14 items-center justify-between p-4">
            <span>{item}</span>
            <span className="text-xs text-muted">{es.more.comingSoon}</span>
          </li>
        ))}
      </ul>
      <PushSettings />
      {household.role === "admin" && <InviteForm householdId={household.id} />}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{user.email}</span>
        <LogoutButton />
      </div>
    </section>
  );
}
