"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { uploadManual } from "@/lib/documents/upload";
import { buttonCls, linkBtnCls } from "@/components/ui";

const t = es.appliances;

export function ApplianceManual({ id, hasManual, canEdit }: { id: string; hasManual: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function attach(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (!navigator.onLine) return setMessage(t.needsConnection);
    setBusy(true);
    const res = await uploadManual(id, file);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (res === "ok") router.refresh();
    else setMessage(res === "too_large" ? t.tooLarge : res === "bad_file" ? t.badFile : es.auth.genericError);
  }

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{t.manual}</h2>
      {hasManual ? (
        <a className={`${buttonCls} flex items-center justify-center`} href={`/api/appliances/${id}/manual`} target="_blank" rel="noreferrer">
          {t.viewManual}
        </a>
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noManual}</p>
      )}
      {canEdit && (
        <>
          <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={(e) => void attach(e.target.files?.[0])} />
          <button className={linkBtnCls} disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t.uploading : hasManual ? t.replaceManual : t.attachManual}
          </button>
        </>
      )}
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}
    </section>
  );
}
