"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { compressPhoto, makeThumbnail } from "@/lib/image";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

type Item = { id: string; title: string; notes: string | null };
type Photo = { id: string };
type Box = { id: string; name: string; location: string | null; notes: string | null };

export function BoxContent({
  box,
  items,
  photos,
  canEdit,
}: {
  box: Box;
  items: Item[];
  photos: Photo[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: box.name, location: box.location ?? "", notes: box.notes ?? "" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(String(res.status));
    return res;
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch {
      setError(es.auth.genericError);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const [full, thumb] = await Promise.all([compressPhoto(file), makeThumbnail(file)]);
        const form = new FormData();
        form.set("id", newId());
        form.set("entityType", "box");
        form.set("entityId", box.id);
        form.set("width", String(full.width));
        form.set("height", String(full.height));
        form.set("file", new File([full.blob], "foto.jpg", { type: "image/jpeg" }));
        form.set("thumb", new File([thumb.blob], "mini.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/photos", { method: "POST", body: form });
        if (!res.ok) throw new Error(String(res.status));
        router.refresh();
      } catch {
        setError(es.boxes.uploadError);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await call(`/api/boxes/${box.id}`, "PATCH", {
                name: draft.name,
                location: draft.location || null,
                notes: draft.notes || null,
              });
              setEditing(false);
            });
          }}
        >
          <input className={inputCls} required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputCls} placeholder={es.boxes.locationLabel} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <textarea className={`${inputCls} py-3`} rows={3} placeholder={es.boxes.notesLabel} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <div className="flex gap-3">
            <button className={buttonCls}>{es.boxes.save}</button>
            <button type="button" className={linkBtnCls} onClick={() => setEditing(false)}>{es.boxes.cancel}</button>
          </div>
        </form>
      ) : (
        canEdit && (
          <div className="flex gap-4">
            <button className={linkBtnCls} onClick={() => setEditing(true)}>{es.boxes.edit}</button>
            <button
              className={`${linkBtnCls} !text-red-600`}
              onClick={() => {
                if (confirm(es.boxes.confirmDelete))
                  void run(async () => {
                    await call(`/api/boxes/${box.id}`, "DELETE");
                    router.replace("/boxes");
                  });
              }}
            >
              {es.boxes.delete}
            </button>
          </div>
        )
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">{es.boxes.photos}</h2>
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <a href={`/api/files/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/${p.id}?thumb=1`} alt="" loading="lazy" className="h-full w-full object-cover" />
                </a>
                {canEdit && (
                  <button
                    aria-label={es.boxes.delete}
                    className="absolute right-1 top-1 size-8 rounded-full bg-black/60 text-white"
                    onClick={() => {
                      if (confirm(es.boxes.confirmDeletePhoto)) void run(() => call(`/api/photos/${p.id}`, "DELETE").then(() => undefined));
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="grid grid-cols-2 gap-3">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => uploadFiles(e.target.files)} />
            <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
            <button className={buttonCls} onClick={() => cameraRef.current?.click()}>{es.boxes.takePhoto}</button>
            <button className={buttonCls} onClick={() => galleryRef.current?.click()}>{es.boxes.pickPhoto}</button>
          </div>
        )}
        {uploading > 0 && <p className="text-sm text-muted">{es.boxes.uploading}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{es.boxes.contents}</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-muted">{es.boxes.contentsEmpty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 p-4">
                <span>{it.title}</span>
                {canEdit && (
                  <button aria-label={es.boxes.delete} className="min-h-11 min-w-11 text-muted"
                    onClick={() => void run(() => call(`/api/box-items/${it.id}`, "DELETE").then(() => undefined))}>
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = title.trim();
              if (!t) return;
              void run(async () => {
                await call(`/api/boxes/${box.id}/items`, "POST", { id: newId(), title: t });
                setTitle("");
              });
            }}
          >
            <input className={inputCls} placeholder={es.boxes.itemPlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="min-h-12 shrink-0 rounded-xl bg-primary px-4 font-semibold text-white dark:text-slate-900">+</button>
          </form>
        )}
      </section>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
