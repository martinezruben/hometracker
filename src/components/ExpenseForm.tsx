"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { todayInput } from "@/lib/format";
import { mutate } from "@/lib/offline/outbox";
import { uploadReceipt } from "@/lib/documents/upload";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/schemas";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.expenses;
export type ExpenseValues = { title: string; amount: string; spentAt: string; category: string; providerId: string; notes: string };

/** Crea (sin `expenseId`) o edita un gasto; al crear puede adjuntar el recibo. */
export function ExpenseForm({
  expenseId,
  initial,
  providers,
  onDone,
}: {
  expenseId?: string;
  initial?: ExpenseValues;
  providers: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<ExpenseValues>(initial ?? { title: "", amount: "", spentAt: todayInput(), category: "", providerId: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ExpenseValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (file && !navigator.onLine) return setError(t.needsConnection);
    setBusy(true);
    const body = {
      title: f.title,
      amount: Number(f.amount),
      spentAt: f.spentAt,
      category: f.category || null,
      providerId: f.providerId || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (expenseId) {
        const { queued } = await mutate({ url: `/api/expenses/${expenseId}`, method: "PATCH", body, meta: { op: "expense-update", expenseId } });
        onDone?.();
        if (!queued) router.refresh();
        return;
      }
      const id = newId();
      const { queued } = await mutate({
        url: "/api/expenses",
        method: "POST",
        body: { id, ...body },
        meta: { op: "expense-create", expenseId: id, name: f.title },
      });
      if (!queued && file) {
        const res = await uploadReceipt(id, file);
        if (res !== "ok") {
          router.replace(`/expenses/${id}`); // el gasto ya existe: se reintenta el recibo desde allí
          return;
        }
      }
      router.replace(queued ? "/expenses" : `/expenses/${id}`);
      if (!queued) router.refresh();
    } catch {
      setBusy(false);
      setError(es.auth.genericError);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.titleLabel}</span>
        <input className={inputCls} required maxLength={200} placeholder={t.titlePlaceholder} value={f.title} onChange={set("title")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.amountLabel}</span>
          <input className={inputCls} required type="number" inputMode="decimal" min="0.01" step="0.01" value={f.amount} onChange={set("amount")} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.dateLabel}</span>
          <input className={inputCls} required type="date" value={f.spentAt} onChange={set("spentAt")} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.categoryLabel}</span>
        <select className={inputCls} value={f.category} onChange={set("category")}>
          <option value="">{t.uncategorized}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.providerLabel}</span>
        <select className={inputCls} value={f.providerId} onChange={set("providerId")}>
          <option value="">{t.none}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.notesLabel}</span>
        <textarea className={`${inputCls} py-3`} rows={2} maxLength={5000} value={f.notes} onChange={set("notes")} />
      </label>
      {!expenseId && (
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.receiptLabel}</span>
          <input className={inputCls} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonCls} disabled={busy || !f.title.trim() || !f.amount}>{expenseId ? t.save : t.create}</button>
        {onDone && <button type="button" className={linkBtnCls} onClick={onDone}>{t.cancel}</button>}
      </div>
    </form>
  );
}
