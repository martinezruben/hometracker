"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.lists;

export function NewListForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("shopping");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = newId();
    try {
      const { queued } = await mutate({
        url: "/api/lists",
        method: "POST",
        body: { id, name, type },
        meta: { op: "list-create", listId: id, name },
      });
      setName("");
      setOpen(false);
      if (!queued) router.push(`/lists/${id}`);
    } catch {
      setError(es.auth.genericError);
    }
  }

  if (!open) return <button className={buttonCls} onClick={() => setOpen(true)}>{t.newList}</button>;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.nameLabel}</span>
        <input className={inputCls} required maxLength={160} placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.typeLabel}</span>
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(t.types).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonCls} disabled={!name.trim()}>{t.create}</button>
        <button type="button" className={linkBtnCls} onClick={() => setOpen(false)}>{es.boxes.cancel}</button>
      </div>
    </form>
  );
}
