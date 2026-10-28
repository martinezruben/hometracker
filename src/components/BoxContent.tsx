"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { newId } from "@/lib/uuid";
import { mutate } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import type { OutboxMeta } from "@/lib/offline/db";
import { BoxIcon, PlusIcon } from "@/components/icons";
import { EntityPhotos } from "@/components/EntityPhotos";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

type Item = { id: string; title: string; quantity: number; category: string | null; notes: string | null };
type Photo = { id: string };
type Color = "blue" | "orange" | "green" | "purple";
type Box = { id: string; name: string; location: string | null; notes: string | null; color: Color };

const tints: Tint[] = ["blue", "yellow", "green", "purple", "orange"];
/** Color estable por categoría, para que "Eléctrico" siempre se vea igual. */
const tintFor = (category: string | null): Tint => {
  let h = 0;
  for (const ch of category ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
};

export function BoxContent({ box, items, photos, canEdit }: { box: Box; items: Item[]; photos: Photo[]; canEdit: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("1");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: box.name, location: box.location ?? "", notes: box.notes ?? "", color: box.color });

  const outbox = useOutbox();
  const pending = outbox.filter((i) => !i.error && i.meta.boxId === box.id);
  const hiddenItems = new Set(pending.filter((i) => i.meta.op === "item-delete").map((i) => i.meta.itemId));
  const knownItems = new Set(items.map((i) => i.id));
  const pendingItems = pending.filter((i) => i.meta.op === "item-add" && !knownItems.has(i.meta.itemId!));
  const shownItems = items.filter((i) => !hiddenItems.has(i.id));

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

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-label={es.boxes.contents}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{es.boxes.contents}</h2>
          {canEdit && (
            <a href="#agregar" className="flex min-h-11 items-center gap-1 text-sm font-bold text-link">
              <PlusIcon width={16} height={16} /> {es.boxes.add}
            </a>
          )}
        </div>
        {shownItems.length === 0 && pendingItems.length === 0 ? (
          <p className="rounded-2xl bg-tile p-4 text-muted">{es.boxes.contentsEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {shownItems.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-3">
                <IconTile tint={tintFor(it.category)}><BoxIcon width={22} height={22} /></IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{it.title}</p>
                  {(it.category || it.notes) && <p className="truncate text-sm text-muted">{[it.category, it.notes].filter(Boolean).join(" · ")}</p>}
                </div>
                <span className="shrink-0 font-extrabold text-link">×{it.quantity}</span>
                {canEdit && (
                  <button
                    aria-label={`${es.boxes.delete} ${it.title}`}
                    className="min-h-11 min-w-11 text-xl text-muted"
                    onClick={() => void run(() => call(`/api/box-items/${it.id}`, "DELETE", { op: "item-delete", itemId: it.id }).then(() => undefined))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {pendingItems.map((it) => (
              <li key={it.seq} className="flex items-center gap-3 py-3 text-muted">
                <IconTile tint="blue"><BoxIcon width={22} height={22} /></IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{String(it.meta.data?.title ?? it.meta.title ?? "")}</p>
                  <p className="text-sm">{es.sync.pendingTag}</p>
                </div>
                <span className="shrink-0 font-extrabold">×{String(it.meta.data?.quantity ?? 1)}</span>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form
            id="agregar"
            className="scroll-mt-24 space-y-2 rounded-2xl bg-tile p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const t = title.trim();
              if (!t) return;
              const quantity = Math.max(1, Math.min(9999, Math.floor(Number(qty) || 1)));
              void run(async () => {
                const itemId = newId();
                const cat = category.trim() || null;
                await call(`/api/boxes/${box.id}/items`, "POST", { op: "item-add", itemId, title: t, data: { title: t, quantity, category: cat } }, { id: itemId, title: t, quantity, category: cat });
                setTitle("");
                setQty("1");
                setCategory("");
              });
            }}
          >
            <div className="flex gap-2">
              <input className={inputCls} aria-label={es.boxes.itemPlaceholder} placeholder={es.boxes.itemPlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
              <button aria-label={es.boxes.add} className="flex min-h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
                <PlusIcon width={22} height={22} />
              </button>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <input className={inputCls} aria-label={es.boxes.quantityLabel} type="number" inputMode="numeric" min="1" max="9999" value={qty} onChange={(e) => setQty(e.target.value)} />
              <input className={inputCls} aria-label={es.boxes.categoryLabel} list="box-categories" maxLength={80} placeholder={es.boxes.categoryPlaceholder} value={category} onChange={(e) => setCategory(e.target.value)} />
              <datalist id="box-categories">
                {es.boxes.categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </form>
        )}
      </section>

      <div id="fotos" className="scroll-mt-24">
        <EntityPhotos entityType="box" entityId={box.id} photos={photos} canEdit={canEdit} title={es.boxes.photos} />
      </div>

      {canEdit && (
        <section id="acciones" className="scroll-mt-24 space-y-3">
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await call(`/api/boxes/${box.id}`, "PATCH", { op: "box-update" }, { name: draft.name, location: draft.location || null, notes: draft.notes || null, color: draft.color });
                  setEditing(false);
                });
              }}
            >
              <input className={inputCls} aria-label={es.boxes.nameLabel} required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className={inputCls} aria-label={es.boxes.locationLabel} placeholder={es.boxes.locationLabel} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
              <textarea className={`${inputCls} py-3`} aria-label={es.boxes.notesLabel} rows={3} placeholder={es.boxes.notesLabel} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <fieldset className="space-y-1">
                <legend className="text-sm text-muted">{es.boxes.colorLabel}</legend>
                <div className="flex gap-3">
                  {(["blue", "orange", "green", "purple"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={es.boxes.colors[c]}
                      aria-pressed={draft.color === c}
                      onClick={() => setDraft({ ...draft, color: c })}
                      className={`size-11 rounded-full border-2 ${draft.color === c ? "border-link" : "border-transparent"}`}
                      style={{ background: `var(--tint-${c})` }}
                    />
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center gap-3">
                <button className={buttonCls}>{es.boxes.save}</button>
                <button type="button" className={linkBtnCls} onClick={() => setEditing(false)}>{es.boxes.cancel}</button>
              </div>
            </form>
          ) : (
            <div className="flex gap-4">
              <button className={linkBtnCls} onClick={() => setEditing(true)}>{es.boxes.edit}</button>
              <button
                className={`${linkBtnCls} !text-danger`}
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
          )}
        </section>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
