"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { mutate } from "@/lib/offline/outbox";
import { uploadDocumentFile } from "@/lib/documents/upload";
import { DocumentForm, type DocumentValues } from "@/components/DocumentForm";
import { buttonCls, linkBtnCls } from "@/components/ui";

const t = es.documents;

export function DocumentActions({
  id,
  hasFile,
  initial,
  providers,
  appliances,
  canEdit,
}: {
  id: string;
  hasFile: boolean;
  initial: DocumentValues;
  providers: { id: string; name: string }[];
  appliances: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function attach(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (!navigator.onLine) return setMessage(t.needsConnection);
    setBusy(true);
    const res = await uploadDocumentFile(id, file);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (res === "ok") router.refresh();
    else setMessage(res === "too_large" ? t.tooLarge : res === "bad_file" ? t.badFile : es.auth.genericError);
  }

  return (
    <div className="space-y-4">
      {hasFile ? (
        <a className={`${buttonCls} flex items-center justify-center`} href={`/api/documents/${id}/file`} target="_blank" rel="noreferrer">
          {t.viewFile}
        </a>
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noFile}</p>
      )}
      {canEdit && (
        <>
          <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={(e) => void attach(e.target.files?.[0])} />
          <button className={linkBtnCls} disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t.uploading : hasFile ? t.replaceFile : t.attachFile}
          </button>
          {editing ? (
            <DocumentForm documentId={id} initial={initial} providers={providers} appliances={appliances} onDone={() => setEditing(false)} />
          ) : (
            <div className="flex gap-4">
              <button className={linkBtnCls} onClick={() => setEditing(true)}>{t.edit}</button>
              <button
                className={`${linkBtnCls} !text-danger`}
                onClick={async () => {
                  if (!confirm(t.confirmDelete)) return;
                  try {
                    const { queued } = await mutate({ url: `/api/documents/${id}`, method: "DELETE", meta: { op: "document-delete", documentId: id } });
                    router.replace("/documents");
                    if (!queued) router.refresh();
                  } catch {
                    setMessage(es.auth.genericError);
                  }
                }}
              >
                {t.delete}
              </button>
            </div>
          )}
        </>
      )}
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}
    </div>
  );
}
