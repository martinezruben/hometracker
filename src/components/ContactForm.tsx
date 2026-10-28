"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.contacts;
export type ContactValues = { name: string; category: string; phone: string; email: string; rating: string; notes: string };
const blank: ContactValues = { name: "", category: "", phone: "", email: "", rating: "", notes: "" };

/** Crea (sin `contactId`) o edita un contacto. Funciona sin conexión vía la cola local. */
export function ContactForm({
  contactId,
  initial = blank,
  onDone,
}: {
  contactId?: string;
  initial?: ContactValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ContactValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const empty = (v: string) => (v.trim() ? v.trim() : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: f.name,
      category: empty(f.category),
      phone: empty(f.phone),
      email: empty(f.email) ?? "",
      rating: f.rating ? Number(f.rating) : null,
      notes: empty(f.notes),
    };
    try {
      if (contactId) {
        const { queued } = await mutate({ url: `/api/contacts/${contactId}`, method: "PATCH", body, meta: { op: "contact-update", contactId } });
        onDone?.();
        if (!queued) router.refresh();
      } else {
        const id = newId();
        const { queued } = await mutate({
          url: "/api/contacts",
          method: "POST",
          body: { id, ...body },
          meta: { op: "contact-create", contactId: id, name: f.name },
        });
        router.replace(queued ? "/contacts" : `/contacts/${id}`);
        if (!queued) router.refresh();
      }
    } catch {
      setBusy(false);
      setError(es.auth.genericError);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.nameLabel}</span>
        <input className={inputCls} required maxLength={160} value={f.name} onChange={set("name")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.categoryLabel}</span>
        <input className={inputCls} list="contact-categories" maxLength={80} placeholder={t.categoryPlaceholder} value={f.category} onChange={set("category")} />
        <datalist id="contact-categories">
          {t.categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.phoneLabel}</span>
        <input className={inputCls} type="tel" inputMode="tel" maxLength={40} value={f.phone} onChange={set("phone")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.emailLabel}</span>
        <input className={inputCls} type="email" inputMode="email" maxLength={255} value={f.email} onChange={set("email")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.ratingLabel}</span>
        <select className={inputCls} value={f.rating} onChange={set("rating")}>
          <option value="">{t.noRating}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{"★".repeat(n)}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.notesLabel}</span>
        <textarea className={`${inputCls} py-3`} rows={3} maxLength={5000} value={f.notes} onChange={set("notes")} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonCls} disabled={busy || !f.name.trim()}>{contactId ? t.save : t.create}</button>
        {onDone && <button type="button" className={linkBtnCls} onClick={onDone}>{t.cancel}</button>}
      </div>
    </form>
  );
}
