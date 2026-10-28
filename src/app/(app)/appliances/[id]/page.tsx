import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getApplianceAccess, getApplianceContent } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { formatDate, formatMoney, toDateInput } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { nextDueAfter } from "@/lib/maintenance/schedule";
import { ApplianceActions } from "@/components/ApplianceActions";
import { ApplianceMaintenance } from "@/components/ApplianceMaintenance";
import { DueBadge } from "@/components/DueBadge";
import { EntityPhotos } from "@/components/EntityPhotos";
import { linkBtnCls } from "@/components/ui";

const t = es.appliances;

export default async function ApplianceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getApplianceAccess(user.id, parsed.data);
  if (!access) return <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noAccess}</p>;

  const { appliance: a, role } = access;
  const { plans, logs, photos } = await getApplianceContent(a);
  const canEdit = role !== "viewer";
  const now = new Date();
  const warranty = a.warrantyUntil
    ? a.warrantyUntil >= now
      ? t.warrantyActive(formatDate(a.warrantyUntil))
      : t.warrantyExpired(formatDate(a.warrantyUntil))
    : null;

  return (
    <section className="space-y-6">
      <Link href="/appliances" className={linkBtnCls}>← {t.back}</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{a.name}</h1>
        <p className="text-muted">{[a.brand, a.model].filter(Boolean).join(" · ")}</p>
        {a.location && <p className="text-sm text-muted">{a.location}</p>}
        {a.serial && <p className="text-sm text-muted">{t.serialLabel}: {a.serial}</p>}
        {a.purchaseDate && <p className="text-sm text-muted">{t.purchasedOn(formatDate(a.purchaseDate))}</p>}
        {warranty && <p className="text-sm">{warranty}</p>}
        {a.notes && <p className="mt-2 whitespace-pre-line text-sm">{a.notes}</p>}
      </header>

      {canEdit && (
        <ApplianceActions
          id={a.id}
          initial={{
            name: a.name,
            brand: a.brand ?? "",
            model: a.model ?? "",
            serial: a.serial ?? "",
            location: a.location ?? "",
            purchaseDate: toDateInput(a.purchaseDate),
            warrantyUntil: toDateInput(a.warrantyUntil),
            notes: a.notes ?? "",
          }}
        />
      )}

      <ApplianceMaintenance
        applianceId={a.id}
        canEdit={canEdit}
        plans={plans.map((p) => ({
          id: p.id,
          title: p.title,
          intervalValue: p.intervalValue,
          intervalUnit: p.intervalUnit,
          remindDaysBefore: p.remindDaysBefore,
          nextDueLabel: formatDate(p.nextDue),
          badge: <DueBadge nextDue={p.nextDue} now={now} />,
        }))}
      />

      <EntityPhotos entityType="appliance" entityId={a.id} photos={photos.map((p) => ({ id: p.id }))} canEdit={canEdit} title={t.photos} />

      <section className="space-y-3">
        <h2 className="font-semibold">{t.history}</h2>
        {logs.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {logs.map((l) => {
              const plan = plans.find((p) => p.id === l.planId);
              return (
                <li key={l.id} className="p-4">
                  <p className="font-medium">{plan?.title ?? t.maintenance}</p>
                  <p className="text-sm text-muted">
                    {formatDate(l.doneAt)}
                    {l.cost != null && ` · ${formatMoney(l.cost)}`}
                    {plan && ` · ${t.nextAfter(formatDate(nextDueAfter(l.doneAt, plan.intervalValue, plan.intervalUnit)))}`}
                  </p>
                  {l.notes && <p className="text-sm">{l.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
