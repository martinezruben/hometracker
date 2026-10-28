"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.appliances;

type Values = { name: string; brand: string; model: string; serial: string; location: string; purchaseDate: string; warrantyUntil: string; notes: string };

export function ApplianceActions({ id, initial }: { id: string; initial: Values }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const empty = (v: string) => (v.trim() ? v.trim() : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { queued } = await mutate({
        url: `/api/appliances/${id}`,
        method: "PATCH",
        body: {
          name: f.name,
          brand: empty(f.brand),
          model: empty(f.model),
          serial: empty(f.serial),
          location: empty(f.location),
          purchaseDate: f.purchaseDate || null,
          warrantyUntil: f.warrantyUntil || null,
          notes: empty(f.notes),
        },
        meta: { op: "appliance-update", applianceId: id },
      });
      setEditing(false);
      if (!queued) router.refresh();
    } catch {
      setError(es.auth.genericError);
    }
  }

  async function remove() {
    if (!confirm(t.confirmDelete)) return;
    try {
      const { queued } = await mutate({ url: `/api/appliances/${id}`, method: "DELETE", meta: { op: "appliance-delete", applianceId: id } });
      router.replace("/appliances");
      if (!queued) router.refresh();
    } catch {
      setError(es.auth.genericError);
    }
  }

  if (!editing) {
    return (
      <div className="flex gap-4">
        <button className={linkBtnCls} onClick={() => setEditing(true)}>{t.edit}</button>
        <button className={`${linkBtnCls} !text-red-600`} onClick={remove}>{t.delete}</button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
  const input = (label: string, k: keyof Values, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      <input className={inputCls} value={f[k]} onChange={set(k)} {...props} />
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-3">
      {input(t.nameLabel, "name", { required: true, maxLength: 160 })}
      {input(t.brandLabel, "brand", { maxLength: 120 })}
      {input(t.modelLabel, "model", { maxLength: 120 })}
      {input(t.serialLabel, "serial", { maxLength: 120 })}
      {input(t.locationLabel, "location", { maxLength: 160 })}
      {input(t.purchaseLabel, "purchaseDate", { type: "date" })}
      {input(t.warrantyLabel, "warrantyUntil", { type: "date" })}
      <textarea className={`${inputCls} py-3`} rows={3} placeholder={t.notesLabel} value={f.notes} onChange={set("notes")} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonCls}>{t.save}</button>
        <button type="button" className={linkBtnCls} onClick={() => setEditing(false)}>{t.cancel}</button>
      </div>
    </form>
  );
}
