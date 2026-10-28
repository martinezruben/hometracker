import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { listAppliances } from "@/lib/appliances/data";
import { listContacts } from "@/lib/contacts/data";
import { getDocumentAccess } from "@/lib/documents/data";
import { uuid } from "@/lib/documents/schemas";
import { formatDate, formatMoney, toDateInput } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { DocumentActions } from "@/components/DocumentActions";
import { DueBadge } from "@/components/DueBadge";
import { linkBtnCls } from "@/components/ui";

const t = es.documents;

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getDocumentAccess(user.id, parsed.data);
  if (!access) return <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noAccess}</p>;
  const { document: d, role } = access;
  const [contacts, appliances] = await Promise.all([listContacts(d.householdId), listAppliances(d.householdId)]);
  const provider = contacts.find((c) => c.id === d.providerId);
  const appliance = appliances.find((a) => a.id === d.applianceId);
  return (
    <section className="space-y-4">
      <Link href="/documents" className={linkBtnCls}>← {t.back}</Link>
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{d.title}</h1>
          {d.expiresAt && <DueBadge nextDue={d.expiresAt} />}
        </div>
        <p className="text-muted">{t.kinds[d.kind]}{d.amount != null && ` · ${formatMoney(d.amount)}`}</p>
        {d.issuedAt && <p className="text-sm text-muted">{t.issued(formatDate(d.issuedAt))}</p>}
        {d.expiresAt && <p className="text-sm text-muted">{t.expires(formatDate(d.expiresAt))}</p>}
        {provider && (
          <p className="text-sm">
            {t.providerLabel}: <Link className="text-primary underline" href={`/contacts/${provider.id}`}>{provider.name}</Link>
          </p>
        )}
        {appliance && (
          <p className="text-sm">
            {t.applianceLabel}: <Link className="text-primary underline" href={`/appliances/${appliance.id}`}>{appliance.name}</Link>
          </p>
        )}
        {d.notes && <p className="whitespace-pre-line text-sm">{d.notes}</p>}
      </header>
      <DocumentActions
        id={d.id}
        hasFile={!!d.fileKey}
        canEdit={role !== "viewer"}
        providers={contacts.map((c) => ({ id: c.id, name: c.name }))}
        appliances={appliances.map((a) => ({ id: a.id, name: a.name }))}
        initial={{
          kind: d.kind,
          title: d.title,
          issuedAt: toDateInput(d.issuedAt),
          expiresAt: toDateInput(d.expiresAt),
          amount: d.amount != null ? String(d.amount) : "",
          providerId: d.providerId ?? "",
          applianceId: d.applianceId ?? "",
          notes: d.notes ?? "",
        }}
      />
    </section>
  );
}
