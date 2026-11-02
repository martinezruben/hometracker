import Link from "next/link";
import { InviteForm } from "@/components/InviteForm";
import { LogoutButton } from "@/components/LogoutButton";
import { AccountForm } from "@/components/AccountForm";
import { HouseholdNameForm } from "@/components/HouseholdNameForm";
import { PasswordForm } from "@/components/PasswordForm";
import { BellIcon, ContactsIcon, FileIcon, HistoryIcon, PrinterIcon, WalletIcon } from "@/components/icons";
import { Avatar, initialOf } from "@/components/ui/Avatar";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { requireActiveHousehold } from "@/lib/auth/access";
import { es } from "@/lib/i18n/es";

const roleLabel = { admin: es.invite.roles.admin, member: es.invite.roles.member, viewer: es.invite.roles.viewer } as const;

export default async function MorePage() {
  const { user, household } = await requireActiveHousehold();
  const admin = household.role === "admin";
  const modules: { href: string; label: string; hint: string; tint: Tint; Icon: typeof FileIcon }[] = [
    { href: "/activity", label: es.activity.pageTitle, hint: es.more.hints.activity, tint: "green", Icon: HistoryIcon },
    { href: "/documents", label: es.documents.title, hint: es.more.hints.documents, tint: "purple", Icon: FileIcon },
    { href: "/contacts", label: es.contacts.title, hint: es.more.hints.contacts, tint: "orange", Icon: ContactsIcon },
    { href: "/expenses", label: es.expenses.title, hint: es.more.hints.expenses, tint: "yellow", Icon: WalletIcon },
    { href: "/labels", label: es.labels.open, hint: es.more.hints.labels, tint: "teal", Icon: PrinterIcon },
    { href: "/reminders", label: es.reminders.open, hint: es.more.hints.reminders, tint: "blue", Icon: BellIcon },
  ];

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4">
        <Avatar seed={user.id} label={initialOf(user.name, user.email)} size={64} />
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-[30px] font-extrabold tracking-tight">{user.name?.trim() || user.email.split("@")[0]}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-tile px-3 py-0.5 text-xs font-bold">{household.name}</span>
            <span className="rounded-full bg-tile px-3 py-0.5 text-xs font-bold text-link">{roleLabel[household.role]}</span>
          </p>
        </div>
      </header>

      <nav aria-label={es.more.title} className="grid grid-cols-2 gap-3">
        {modules.map(({ href, label, hint, tint, Icon }) => (
          <Link key={href} href={href} className="card flex min-h-[112px] flex-col justify-between gap-3 p-4">
            <IconTile tint={tint}><Icon width={24} height={24} /></IconTile>
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold">{label}</span>
              <span className="block text-[13px] text-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      <h2 className="pt-2 text-2xl font-bold">{es.more.settings}</h2>
      {admin && <HouseholdNameForm householdId={household.id} initialName={household.name} />}
      <AccountForm initialName={user.name ?? ""} email={user.email} />
      <PasswordForm />
      {admin && <InviteForm householdId={household.id} />}
      {admin && (
        <section className="card space-y-2 p-4">
          <h2 className="text-lg font-extrabold">{es.data.title}</h2>
          <p className="text-sm text-muted">{es.data.description}</p>
          <a href="/api/export" download className="flex min-h-12 items-center justify-center rounded-2xl border border-primary font-bold text-link">
            {es.data.export}
          </a>
        </section>
      )}
      <div className="flex items-center justify-between rounded-2xl text-sm text-muted">
        <span>{user.email}</span>
        <LogoutButton />
      </div>
    </section>
  );
}
