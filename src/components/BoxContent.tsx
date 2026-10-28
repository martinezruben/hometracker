"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { compressPhoto, makeThumbnail } from "@/lib/image";
import { newId } from "@/lib/uuid";
import { mutate } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import type { OutboxMeta } from "@/lib/offline/db";
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

  const outbox = useOutbox();
  const pending = outbox.filter((i) => !i.error && i.meta.boxId === box.id);
  const hiddenItems = new Set(pending.filter((i) => i.meta.op === "item-delete").map((i) => i.meta.itemId));
  const hiddenPhotos = new Set(pending.filter((i) => i.meta.op === "photo-delete").map((i) => i.meta.photoId));
  const knownItems = new Set(items.map((i) => i.id));
  const pendingItems = pending.filter((i) => i.meta.op === "item-add" && !knownItems.has(i.meta.itemId!));
  const pendingPhotos = pending.filter((i) => i.meta.op === "photo-add");
  const shownItems = items.filter((i) => !hiddenItems.has(i.id));
  const shownPhotos = photos.filter((p) => !hiddenPhotos.has(p.id));

  async function call(url: string, method: string, meta: OutboxMeta, body?: unknown) {
    return mutate({ url, method, body, meta: { boxId: box.id, ...meta } });
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      // Sin conexión no hay nada que recargar: el cambio queda visible desde la cola local.
      if (navigator.onLine) router.refresh();
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
        const photoId = newId();
        await mutate({
          kind: "photo",
          url: "/api/photos",
          method: "POST",
          photo: {
            fields: {
              id: photoId,
              entityType: "box",
              entityId: box.id,
              width: String(full.width),
              height: String(full.height),
            },
            file: full.blob,
            thumb: thumb.blob,
          },
          meta: { op: "photo-add", boxId: box.id, photoId },
        });
        if (navigator.onLine) router.refresh();
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
              await call(`/api/boxes/${box.id}`, "PATCH", { op: "box-update" }, {
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
                    await call(`/api/boxes/${box.id}`, "DELETE", { op: "box-delete" });
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
        {(shownPhotos.length > 0 || pendingPhotos.length > 0) && (
          <ul className="grid grid-cols-3 gap-2">
            {shownPhotos.map((p) => (
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
                      if (confirm(es.boxes.confirmDeletePhoto)) void run(() => call(`/api/photos/${p.id}`, "DELETE", { op: "photo-delete", photoId: p.id }).then(() => undefined));
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {pendingPhotos.map((p) => (
              <PendingPhoto key={p.seq} blob={p.photo!.thumb} />
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
        {shownItems.length === 0 && pendingItems.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-muted">{es.boxes.contentsEmpty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {shownItems.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 p-4">
                <span>{it.title}</span>
                {canEdit && (
                  <button aria-label={es.boxes.delete} className="min-h-11 min-w-11 text-muted"
                    onClick={() => void run(() => call(`/api/box-items/${it.id}`, "DELETE", { op: "item-delete", itemId: it.id }).then(() => undefined))}>
                    ×
                  </button>
                )}
              </li>
            ))}
            {pendingItems.map((it) => (
              <li key={it.seq} className="flex items-center justify-between gap-3 p-4 text-muted">
                <span>{it.meta.title}</span>
                <span className="text-xs">{es.sync.pendingTag}</span>
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
                const itemId = newId();
                await call(`/api/boxes/${box.id}/items`, "POST", { op: "item-add", itemId, title: t }, { id: itemId, title: t });
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

function PendingPhoto({ blob }: { blob: Blob }) {
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  return (
    <li className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border opacity-70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">{es.sync.pendingTag}</span>
    </li>
  );
}
