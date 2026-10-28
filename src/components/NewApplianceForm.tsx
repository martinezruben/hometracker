"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls } from "@/components/ui";

const t = es.appliances;

export function NewApplianceForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", brand: "", model: "", serial: "", location: "", purchaseDate: "", warrantyUntil: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const id = newId();
    const empty = (v: string) => (v.trim() ? v.trim() : null);
    try {
      const { queued } = await mutate({
        url: "/api/appliances",
        method: "POST",
        body: {
          id,
          name: f.name,
          brand: empty(f.brand),
          model: empty(f.model),
          serial: empty(f.serial),
          location: empty(f.location),
          purchaseDate: f.purchaseDate || null,
          warrantyUntil: f.warrantyUntil || null,
          notes: empty(f.notes),
        },
        meta: { op: "appliance-create", applianceId: id, name: f.name },
      });
      router.replace(queued ? "/appliances" : `/appliances/${id}`);
      if (!queued) router.refresh();
    } catch {
      setBusy(false);
      setError(es.auth.genericError);
    }
  }

  const field = (label: string, k: keyof typeof f, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      <input className={inputCls} value={f[k]} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {field(t.nameLabel, "name", { required: true, maxLength: 160, placeholder: t.namePlaceholder })}
      {field(t.brandLabel, "brand", { maxLength: 120 })}
      {field(t.modelLabel, "model", { maxLength: 120 })}
      {field(t.serialLabel, "serial", { maxLength: 120 })}
      {field(t.locationLabel, "location", { maxLength: 160 })}
      {field(t.purchaseLabel, "purchaseDate", { type: "date" })}
      {field(t.warrantyLabel, "warrantyUntil", { type: "date" })}
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.notesLabel}</span>
        <textarea className={`${inputCls} py-3`} rows={3} maxLength={5000} value={f.notes} onChange={set("notes")} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className={buttonCls} disabled={busy || !f.name.trim()}>{t.create}</button>
    </form>
  );
}
