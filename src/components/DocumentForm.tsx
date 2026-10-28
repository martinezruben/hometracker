"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { uploadDocumentFile } from "@/lib/documents/upload";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.documents;
export type DocumentValues = {
  kind: string;
  title: string;
  issuedAt: string;
  expiresAt: string;
  amount: string;
  providerId: string;
  applianceId: string;
  notes: string;
};
const blank: DocumentValues = { kind: "invoice", title: "", issuedAt: "", expiresAt: "", amount: "", providerId: "", applianceId: "", notes: "" };

/** Crea (sin `documentId`) o edita un documento; al crear puede adjuntar el archivo. */
export function DocumentForm({
  documentId,
  initial = blank,
  providers,
  appliances,
  onDone,
}: {
  documentId?: string;
  initial?: DocumentValues;
  providers: { id: string; name: string }[];
  appliances: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof DocumentValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (file && !navigator.onLine) return setError(t.needsConnection);
    setBusy(true);
    const body = {
      kind: f.kind,
      title: f.title,
      issuedAt: f.issuedAt || null,
      expiresAt: f.expiresAt || null,
      amount: f.amount ? Number(f.amount) : null,
      providerId: f.providerId || null,
      applianceId: f.applianceId || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (documentId) {
        const { queued } = await mutate({ url: `/api/documents/${documentId}`, method: "PATCH", body, meta: { op: "document-update", documentId } });
        onDone?.();
        if (!queued) router.refresh();
        return;
      }
      const id = newId();
      const { queued } = await mutate({
        url: "/api/documents",
        method: "POST",
        body: { id, ...body },
        meta: { op: "document-create", documentId: id, name: f.title },
      });
      if (!queued && file) {
        const res = await uploadDocumentFile(id, file);
        if (res !== "ok") {
          // El documento ya existe: se abre para reintentar el archivo desde allí.
          router.replace(`/documents/${id}`);
          return;
        }
      }
      router.replace(queued ? "/documents" : `/documents/${id}`);
      if (!queued) router.refresh();
    } catch {
      setBusy(false);
      setError(es.auth.genericError);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.kindLabel}</span>
        <select className={inputCls} value={f.kind} onChange={set("kind")}>
          {Object.entries(t.kinds).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.titleLabel}</span>
        <input className={inputCls} required maxLength={200} placeholder={t.titlePlaceholder} value={f.title} onChange={set("title")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.issuedLabel}</span>
          <input className={inputCls} type="date" value={f.issuedAt} onChange={set("issuedAt")} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.expiresLabel}</span>
          <input className={inputCls} type="date" value={f.expiresAt} onChange={set("expiresAt")} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.amountLabel}</span>
        <input className={inputCls} type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set("amount")} />
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
        <span className="text-sm text-muted">{t.applianceLabel}</span>
        <select className={inputCls} value={f.applianceId} onChange={set("applianceId")}>
          <option value="">{t.none}</option>
          {appliances.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.notesLabel}</span>
        <textarea className={`${inputCls} py-3`} rows={3} maxLength={5000} value={f.notes} onChange={set("notes")} />
      </label>
      {!documentId && (
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.fileLabel}</span>
          <input className={inputCls} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonCls} disabled={busy || !f.title.trim()}>{documentId ? t.save : t.create}</button>
        {onDone && <button type="button" className={linkBtnCls} onClick={onDone}>{t.cancel}</button>}
      </div>
    </form>
  );
}

