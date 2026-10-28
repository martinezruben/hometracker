"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { compressPhoto, makeThumbnail } from "@/lib/image";
import { mutate } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import { newId } from "@/lib/uuid";
import { buttonCls } from "@/components/ui";

/** Galería con subida (cámara/galería) y borrado; funciona sin conexión vía la cola local. */
export function EntityPhotos({
  entityType,
  entityId,
  photos,
  canEdit,
  title,
}: {
  entityType: "box" | "appliance";
  entityId: string;
  photos: { id: string }[];
  canEdit: boolean;
  title: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const pending = useOutbox().filter((i) => !i.error && i.meta.entityId === entityId);
  const hidden = new Set(pending.filter((i) => i.meta.op === "photo-delete").map((i) => i.meta.photoId));
  const pendingAdds = pending.filter((i) => i.meta.op === "photo-add");
  const shown = photos.filter((p) => !hidden.has(p.id));

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
              entityType,
              entityId,
              width: String(full.width),
              height: String(full.height),
            },
            file: full.blob,
            thumb: thumb.blob,
          },
          meta: { op: "photo-add", entityId, photoId },
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

  async function remove(photoId: string) {
    if (!confirm(es.boxes.confirmDeletePhoto)) return;
    try {
      await mutate({ url: `/api/photos/${photoId}`, method: "DELETE", meta: { op: "photo-delete", entityId, photoId } });
      if (navigator.onLine) router.refresh();
    } catch {
      setError(es.auth.genericError);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {(shown.length > 0 || pendingAdds.length > 0) && (
        <ul className="grid grid-cols-3 gap-2">
          {shown.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <a href={`/api/files/${p.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${p.id}?thumb=1`} alt="" loading="lazy" className="h-full w-full object-cover" />
              </a>
              {canEdit && (
                <button
                  aria-label={es.boxes.delete}
                  className="absolute right-1 top-1 size-8 rounded-full bg-black/60 text-white"
                  onClick={() => void remove(p.id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
          {pendingAdds.map((p) => (
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
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

function PendingPhoto({ blob }: { blob: Blob }) {
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  return (
    <li className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border opacity-70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">{es.sync.pendingTag}</span>
    </li>
  );
}
