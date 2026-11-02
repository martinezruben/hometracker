import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getApplianceAccess, getApplianceContent } from "@/lib/appliances/data";
import { uuid } from "@/lib/appliances/schemas";
import { formatDate, formatMoney, toDateInput } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { dueStatus, type DueStatus } from "@/lib/maintenance/schedule";
import { buildApplianceTimeline, splitTimeline } from "@/lib/timeline";
import { Timeline } from "@/components/ui/Timeline";
import { ApplianceActions } from "@/components/ApplianceActions";
import { ApplianceMaintenance } from "@/components/ApplianceMaintenance";
import { DueBadge } from "@/components/DueBadge";
import { ApplianceManual } from "@/components/ApplianceManual";
import { EntityPhotos } from "@/components/EntityPhotos";
import { listContacts } from "@/lib/contacts/data";
import { BookIcon, HistoryIcon, ImageIcon, PinIcon, PrinterIcon, WrenchIcon } from "@/components/icons";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { StatusPill } from "@/components/ui/Status";

const t = es.appliances;

export default async function ApplianceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getApplianceAccess(user.id, parsed.data);
  if (!access) return <p className="card p-4 text-muted">{t.noAccess}</p>;

  const { appliance: a, role } = access;
  const [{ plans, logs, photos }, contacts] = await Promise.all([getApplianceContent(a), listContacts(a.householdId)]);
  const providerName = new Map(contacts.map((c) => [c.id, c.name]));
  const canEdit = role !== "viewer";
  const now = new Date();
  const warranty = a.warrantyUntil
    ? a.warrantyUntil >= now
      ? t.warrantyActive(formatDate(a.warrantyUntil))
      : t.warrantyExpired(formatDate(a.warrantyUntil))
    : null;

  const events = buildApplianceTimeline(a, plans, logs, now, {
    purchased: t.timelinePurchased,
    warrantyEnds: t.timelineWarranty,
    planDone: t.timelineDone,
    doneDetail: (l, next) =>
      [
        l.cost != null ? formatMoney(l.cost) : null,
        next ? t.nextAfter(formatDate(next)) : null,
        l.providerId && providerName.get(l.providerId) ? t.doneBy(providerName.get(l.providerId)!) : null,
        l.notes,
      ]
        .filter(Boolean)
        .join(" · "),
    dueLabel: (days) => (days < 0 ? t.due.overdue(-days) : days === 0 ? t.due.today : t.due.inDays(days)),
  });
  const statuses = plans.map((p) => dueStatus(p.nextDue, now));
  const overdue = statuses.filter((x) => x === "overdue").length;
  const worst: DueStatus | null = plans.length === 0 ? null : overdue > 0 ? "overdue" : statuses.includes("soon") ? "soon" : "ok";
  const nextPlan = [...plans].sort((x, y) => x.nextDue.getTime() - y.nextDue.getTime())[0];
  const totalCost = logs.reduce((n, l) => n + (l.cost ?? 0), 0);
  const tint: Tint = worst === "overdue" ? "red" : worst === "soon" ? "yellow" : worst === "ok" ? "green" : "blue";
  const stats: [string, string][] = [
    [String(plans.length), t.statPlans],
    [String(overdue), t.statOverdue],
    [totalCost > 0 ? formatMoney(totalCost) : "—", t.statSpent],
  ];
  const facts: [string, string][] = [
    a.serial ? [t.serialLabel, a.serial] : null,
    a.purchaseDate ? [t.purchaseLabel, formatDate(a.purchaseDate)] : null,
    a.warrantyUntil ? [t.warrantyLabel, formatDate(a.warrantyUntil)] : null,
    nextPlan ? [t.nextService, `${nextPlan.title} · ${formatDate(nextPlan.nextDue)}`] : null,
  ].filter((x): x is [string, string] => !!x);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/appliances" className="flex min-h-11 items-center text-sm font-bold text-link">← {t.back}</Link>
        <Link href={`/appliances/${a.id}/label`} className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-link">
          <PrinterIcon width={18} height={18} /> {t.printLabel}
        </Link>
      </div>

      <header className="card space-y-4 p-4">
        <div className="flex items-start gap-3">
          <IconTile tint={tint} size={52}><WrenchIcon width={26} height={26} /></IconTile>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-extrabold leading-tight">{a.name}</h1>
            {(a.brand || a.model) && <p className="text-[15px] text-muted">{[a.brand, a.model].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {worst && <StatusPill status={worst}>{overdue > 0 ? t.badgeOverdue(overdue) : worst === "soon" ? t.badgeSoon : t.badgeOk}</StatusPill>}
          {a.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-tile px-3 py-1 text-xs font-bold">
              <PinIcon width={14} height={14} /> {a.location}
            </span>
          )}
          {warranty && <StatusPill status={a.warrantyUntil! >= now ? "ok" : "overdue"}>{warranty}</StatusPill>}
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-tile p-3">
              <dt className="sr-only">{label}</dt>
              <dd className={`font-extrabold ${value.length > 6 ? "text-[14px]" : "text-lg"}`}>{value}</dd>
              <p className="text-xs text-muted" aria-hidden>{label}</p>
            </div>
          ))}
        </dl>

        {facts.length > 0 && (
          <dl className="divide-y divide-border rounded-2xl border border-border text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {a.notes && <p className="whitespace-pre-line rounded-2xl bg-tile p-3 text-sm">{a.notes}</p>}
      </header>

      <nav aria-label={t.jumpTo} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          { href: "#planes", label: t.jumpPlans, Icon: WrenchIcon },
          { href: "#manual", label: t.jumpManual, Icon: BookIcon },
          { href: "#fotos", label: t.jumpPhotos, Icon: ImageIcon },
          { href: "#linea-de-tiempo", label: t.jumpTimeline, Icon: HistoryIcon },
        ].map(({ href, label, Icon }) => (
          <a key={href} href={href} className="card flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-extrabold">
            <Icon width={18} height={18} /> {label}
          </a>
        ))}
      </nav>

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

      <div id="planes" className="scroll-mt-4">
      <ApplianceMaintenance
        applianceId={a.id}
        canEdit={canEdit}
        providers={contacts.map((c) => ({ id: c.id, name: c.name }))}
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

      </div>

      <div id="manual" className="scroll-mt-4">
        <ApplianceManual id={a.id} hasManual={!!a.manualKey} canEdit={canEdit} />
      </div>

      <div id="fotos" className="scroll-mt-4">
        <EntityPhotos entityType="appliance" entityId={a.id} photos={photos.map((p) => ({ id: p.id }))} canEdit={canEdit} title={t.photos} />
      </div>

      <section id="linea-de-tiempo" className="scroll-mt-4 space-y-3">
        <h2 className="text-xl font-extrabold">{es.timeline.title}</h2>
        <Timeline {...splitTimeline(events, now)} now={now} empty={t.historyEmpty} />
      </section>
    </section>
  );
}
