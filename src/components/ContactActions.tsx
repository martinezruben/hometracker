"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { ContactForm, type ContactValues } from "@/components/ContactForm";
import { linkBtnCls } from "@/components/ui";

const t = es.contacts;

export function ContactActions({ id, initial }: { id: string; initial: ContactValues }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) return <ContactForm contactId={id} initial={initial} onDone={() => setEditing(false)} />;
  return (
    <div className="flex gap-4">
      <button className={linkBtnCls} onClick={() => setEditing(true)}>{t.edit}</button>
      <button
        className={`${linkBtnCls} !text-red-600`}
        onClick={async () => {
          if (!confirm(t.confirmDelete)) return;
          try {
            const { queued } = await mutate({ url: `/api/contacts/${id}`, method: "DELETE", meta: { op: "contact-delete", contactId: id } });
            router.replace("/contacts");
            if (!queued) router.refresh();
          } catch {
            setError(es.auth.genericError);
          }
        }}
      >
        {t.delete}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
