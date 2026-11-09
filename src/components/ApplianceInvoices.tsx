"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { uploadInvoice, type UploadResult } from "@/lib/documents/upload";
import { FileIcon } from "@/components/icons";
import { FileViewer } from "@/components/ui/FileViewer";
import { linkBtnCls } from "@/components/ui";

const t = es.appliances.invoices;

export type InvoiceItem = { id: string; mime: string; size: number; dateLabel: string };

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Facturas del equipo: varias, en PDF o foto, con visor en modal (zoom). Subir requiere conexión. */
export function ApplianceInvoices({ applianceId, invoices, canEdit }: { applianceId: string; invoices: InvoiceItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState<{ item: InvoiceItem; n: number } | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setMessage(null);
    if (!navigator.onLine) return setMessage(t.needsConnection);
    let failed: UploadResult | null = null;
    let done = 0;
    for (const [i, file] of picked.entries()) {
      setBusy(t.uploading(i + 1, picked.length));
      const res = await uploadInvoice(applianceId, file);
      if (res === "ok") done++;
      else failed = res;
    }
    setBusy(null);
    if (files.current) files.current.value = "";
    if (camera.current) camera.current.value = "";
    if (done) router.refresh();
    if (failed) setMessage(failed === "too_large" ? es.appliances.tooLarge : failed === "bad_file" ? es.appliances.badFile : es.auth.genericError);
  }

  async function remove(item: InvoiceItem, n: number) {
    if (!confirm(t.confirmDelete(n))) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/appliance-invoices/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setMessage(es.auth.genericError);
    }
  }

  return (
    <section className="space-y-3" aria-label={t.title}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">{t.title}</h2>
        {invoices.length > 0 && <span className="text-sm text-muted">{t.count(invoices.length)}</span>}
      </div>

      {invoices.length === 0 ? (
        <p className="card p-4 text-muted">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv, idx) => {
            const n = invoices.length - idx; // la más antigua es la 1
            const pdf = inv.mime === "application/pdf";
            return (
              <li key={inv.id} className="card flex items-center gap-3 border border-border p-2.5">
                <button
                  type="button"
                  aria-label={t.view(n)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setOpen({ item: inv, n })}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tile text-link">
                    {pdf ? (
                      <FileIcon width={26} height={26} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/appliance-invoices/${inv.id}`} alt="" loading="lazy" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold">{t.name(n)}</span>
                    <span className="block truncate text-sm text-muted">{[pdf ? "PDF" : t.photo, sizeLabel(inv.size), inv.dateLabel].join(" · ")}</span>
                  </span>
                </button>
                {canEdit && (
                  <button type="button" aria-label={t.delete(n)} className="min-h-11 min-w-11 text-xl text-muted" onClick={() => void remove(inv, n)}>×</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <>
          <input ref={files} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void add(e.target.files)} />
          <div className="flex flex-wrap gap-x-5">
            <button type="button" className={linkBtnCls} disabled={!!busy} onClick={() => files.current?.click()}>{t.attach}</button>
            <button type="button" className={linkBtnCls} disabled={!!busy} onClick={() => camera.current?.click()}>{t.takePhoto}</button>
          </div>
        </>
      )}
      {busy && <p role="status" className="text-sm text-muted">{busy}</p>}
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}

      {open && (
        <FileViewer url={`/api/appliance-invoices/${open.item.id}`} mime={open.item.mime} title={t.name(open.n)} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
