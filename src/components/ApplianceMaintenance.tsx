"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { newId } from "@/lib/uuid";
import { todayInput } from "@/lib/format";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.appliances;

export type PlanView = {
  id: string;
  title: string;
  intervalValue: number;
  intervalUnit: "day" | "week" | "month" | "year";
  remindDaysBefore: number;
  nextDueLabel: string;
  badge: React.ReactNode;
};

export function ApplianceMaintenance({
  applianceId,
  plans,
  canEdit,
  providers,
}: {
  applianceId: string;
  plans: PlanView[];
  canEdit: boolean;
  providers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [plan, setPlan] = useState({ title: "", value: "6", unit: "month", firstDue: todayInput(), remind: "7" });
  const [done, setDone] = useState({ date: todayInput(), cost: "", providerId: "" });

  async function run(fn: () => Promise<{ queued: boolean }>) {
    setError(null);
    try {
      const { queued } = await fn();
      if (!queued && navigator.onLine) router.refresh();
      return true;
    } catch {
      setError(es.auth.genericError);
      return false;
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t.maintenance}</h2>
      {plans.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.maintenanceEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li key={p.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">
                    {t.every} {p.intervalValue} {t.units[p.intervalUnit]} · {p.nextDueLabel}
                  </p>
                </div>
                {p.badge}
              </div>
              {canEdit && completing !== p.id && (
                <div className="flex items-center gap-4">
                  <button className={linkBtnCls} onClick={() => setCompleting(p.id)}>{t.markDone}</button>
                  <button
                    className={`${linkBtnCls} !text-danger`}
                    onClick={() => {
                      if (confirm(t.confirmDeletePlan))
                        void run(() =>
                          mutate({ url: `/api/plans/${p.id}`, method: "DELETE", meta: { op: "plan-delete", planId: p.id, applianceId } }),
                        );
                    }}
                  >
                    {t.deletePlan}
                  </button>
                </div>
              )}
              {completing === p.id && (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() =>
                      mutate({
                        url: `/api/plans/${p.id}/complete`,
                        method: "POST",
                        body: { id: newId(), doneAt: done.date, cost: done.cost ? Number(done.cost) : null, providerId: done.providerId || null },
                        meta: { op: "plan-complete", planId: p.id, applianceId },
                      }),
                    ).then((ok) => ok && setCompleting(null));
                  }}
                >
                  <label className="block space-y-1">
                    <span className="text-sm text-muted">{t.doneOn}</span>
                    <input className={inputCls} type="date" required value={done.date} onChange={(e) => setDone({ ...done, date: e.target.value })} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-muted">{t.cost}</span>
                    <input className={inputCls} type="number" inputMode="decimal" min="0" step="0.01" value={done.cost} onChange={(e) => setDone({ ...done, cost: e.target.value })} />
                  </label>
                  {providers.length > 0 && (
                    <label className="block space-y-1">
                      <span className="text-sm text-muted">{t.providerLabel}</span>
                      <select className={inputCls} value={done.providerId} onChange={(e) => setDone({ ...done, providerId: e.target.value })}>
                        <option value="">{t.providerNone}</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="flex items-center gap-3">
                    <button className={buttonCls}>{t.confirmDone}</button>
                    <button type="button" className={linkBtnCls} onClick={() => setCompleting(null)}>{t.cancel}</button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (adding ? (
          <form
            className="space-y-3 rounded-xl border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                mutate({
                  url: `/api/appliances/${applianceId}/plans`,
                  method: "POST",
                  body: {
                    id: newId(),
                    title: plan.title,
                    intervalValue: Number(plan.value),
                    intervalUnit: plan.unit,
                    nextDue: plan.firstDue,
                    remindDaysBefore: Number(plan.remind),
                  },
                  meta: { op: "plan-add", applianceId },
                }),
              ).then((ok) => {
                if (ok) {
                  setAdding(false);
                  setPlan({ ...plan, title: "" });
                }
              });
            }}
          >
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.planTitle}</span>
              <input className={inputCls} required maxLength={200} placeholder={t.planTitlePlaceholder} value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm text-muted">{t.every}</span>
                <input className={inputCls} type="number" inputMode="numeric" min="1" max="999" required value={plan.value} onChange={(e) => setPlan({ ...plan, value: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted">&nbsp;</span>
                <select className={inputCls} value={plan.unit} onChange={(e) => setPlan({ ...plan, unit: e.target.value })}>
                  {Object.entries(t.units).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.firstDue}</span>
              <input className={inputCls} type="date" required value={plan.firstDue} onChange={(e) => setPlan({ ...plan, firstDue: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.remindBefore}</span>
              <input className={inputCls} type="number" inputMode="numeric" min="0" max="365" required value={plan.remind} onChange={(e) => setPlan({ ...plan, remind: e.target.value })} />
            </label>
            <div className="flex items-center gap-3">
              <button className={buttonCls} disabled={!plan.title.trim()}>{t.savePlan}</button>
              <button type="button" className={linkBtnCls} onClick={() => setAdding(false)}>{t.cancel}</button>
            </div>
          </form>
        ) : (
          <button className={buttonCls} onClick={() => setAdding(true)}>{t.addPlan}</button>
        ))}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
