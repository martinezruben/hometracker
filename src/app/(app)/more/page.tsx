import Link from "next/link";
import { InviteForm } from "@/components/InviteForm";
import { LogoutButton } from "@/components/LogoutButton";
import { AccountForm } from "@/components/AccountForm";
import { HouseholdNameForm } from "@/components/HouseholdNameForm";
import { PasswordForm } from "@/components/PasswordForm";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

export default async function MorePage() {
  const { user, household } = await requireActiveHousehold();
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{es.more.title}</h1>
      <ul className="divide-y divide-border card">
        <li>
          <Link href="/lists" className="flex min-h-14 items-center justify-between p-4">
            <span>{es.tasks.title}</span>
            <span aria-hidden>›</span>
          </Link>
        </li>
        {[
          { href: "/documents", label: es.documents.title },
          { href: "/contacts", label: es.contacts.title },
          { href: "/expenses", label: es.expenses.title },
        ].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex min-h-14 items-center justify-between p-4">
              <span>{l.label}</span>
              <span aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
      {household.role === "admin" && <HouseholdNameForm householdId={household.id} initialName={household.name} />}
      <AccountForm initialName={user.name ?? ""} email={user.email} />
      <PasswordForm />
      <Link href="/reminders" className="card flex min-h-14 items-center justify-between p-4">
        <span className="font-extrabold">{es.reminders.open}</span>
        <span aria-hidden>›</span>
      </Link>
      {household.role === "admin" && <InviteForm householdId={household.id} />}
      {household.role === "admin" && (
        <section className="space-y-2 card p-4">
          <h2 className="font-semibold">{es.data.title}</h2>
          <p className="text-sm text-muted">{es.data.description}</p>
          <a href="/api/export" download className="flex min-h-12 items-center justify-center rounded-2xl border border-primary font-bold text-link">
            {es.data.export}
          </a>
        </section>
      )}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{user.email}</span>
        <LogoutButton />
      </div>
    </section>
  );
}
