"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import { mutate } from "@/lib/offline/outbox";
import { overlayListItems, type ListItemView } from "@/lib/offline/overlay";
import { useOutbox } from "@/lib/offline/useOutbox";
import type { OutboxMeta } from "@/lib/offline/db";
import { newId } from "@/lib/uuid";
import { EntityPhotos } from "@/components/EntityPhotos";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.lists;

export function ListDetail({
  list,
  items,
  canEdit,
}: {
  list: { id: string; name: string; type: "shopping" | "sale" | "general" };
  items: ListItemView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const outbox = useOutbox();
  // Cambios locales inmediatos (antes de que lleguen por la cola); se descartan cuando llegan datos nuevos del servidor.
  const [local, setLocal] = useState<Record<string, Partial<ListItemView>>>({});
  const [seenItems, setSeenItems] = useState(items);
  if (seenItems !== items) {
    setSeenItems(items);
    setLocal({});
  }
  const view = overlayListItems(items, outbox, list.id).map((i) => (local[i.id] ? { ...i, ...local[i.id] } : i));
  const isSale = list.type === "sale";
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(req: Parameters<typeof mutate>[0]) {
    setError(null);
    try {
      const { queued } = await mutate(req);
      if (!queued && navigator.onLine) router.refresh();
      return true;
    } catch {
      setError(es.auth.genericError);
      return false;
    }
  }

  const update = (id: string, body: Record<string, unknown>) => {
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...(body as Partial<ListItemView>) } }));
    return run({
      url: `/api/list-items/${id}`,
      method: "PATCH",
      body,
      meta: { op: "list-item-update", listId: list.id, itemId: id, data: body } as OutboxMeta,
    });
  };

  const available = view.filter((i) => i.status === "available" && i.price != null).reduce((s, i) => s + (i.price ?? 0), 0);
  const hasChecked = view.some((i) => i.checked);

  return (
    <div className="space-y-4">
      {isSale && available > 0 && <p className="text-sm text-muted">{t.totalAvailable(formatMoney(available))}</p>}

      {view.length === 0 ? (
        <p className="card p-4 text-muted">{t.empty2}</p>
      ) : (
        <ul className="divide-y divide-border card">
          {view.map((i) => {
            const sold = i.status === "sold";
            const struck = isSale ? sold : i.checked;
            return (
              <li key={i.id} className="p-3">
                <div className="flex items-center gap-3">
                  {!isSale && (
                    <input
                      type="checkbox"
                      aria-label={i.title}
                      className="size-6 shrink-0 accent-[var(--primary)]"
                      checked={i.checked}
                      disabled={!canEdit}
                      onChange={() => void update(i.id, { checked: !i.checked })}
                    />
                  )}
                  <button
                    className="min-h-11 min-w-0 flex-1 text-left"
                    onClick={() => isSale && setExpanded(expanded === i.id ? null : i.id)}
                  >
                    <span className={`block truncate ${struck ? "text-muted line-through" : ""}`}>
                      {i.title}
                      {i.quantity ? ` · ${i.quantity}` : ""}
                    </span>
                    {(i.price != null || i.pending) && (
                      <span className="block text-sm text-muted">
                        {i.price != null && formatMoney(i.price)}
                        {isSale && ` · ${sold ? t.sold : t.available}`}
                        {i.pending && ` · ${es.sync.pendingTag}`}
                      </span>
                    )}
                  </button>
                  {canEdit && (
                    <button
                      aria-label={t.removeItem}
                      className="min-h-11 min-w-11 text-muted"
                      onClick={() =>
                        void run({
                          url: `/api/list-items/${i.id}`,
                          method: "DELETE",
                          meta: { op: "list-item-delete", listId: list.id, itemId: i.id },
                        })
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
                {isSale && expanded === i.id && (
                  <div className="mt-3 space-y-3">
                    {canEdit && (
                      <button className={buttonCls} onClick={() => void update(i.id, { status: sold ? "available" : "sold" })}>
                        {sold ? t.markAvailable : t.markSold}
                      </button>
                    )}
                    <EntityPhotos entityType="list_item" entityId={i.id} photos={i.photos} canEdit={canEdit && !i.pending} title={t.photos} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = title.trim();
            if (!name) return;
            const itemId = newId();
            const priceNum = price ? Number(price) : null;
            const body = { id: itemId, title: name, quantity: qty.trim() || null, price: priceNum };
            void run({
              url: `/api/lists/${list.id}/items`,
              method: "POST",
              body,
              meta: {
                op: "list-item-add",
                listId: list.id,
                itemId,
                data: { title: name, quantity: body.quantity, price: priceNum, status: isSale ? "available" : "pending" },
              },
            }).then((ok) => {
              if (ok) {
                setTitle("");
                setQty("");
                setPrice("");
              }
            });
          }}
        >
          <div className="flex gap-2">
            <input className={inputCls} placeholder={t.itemPlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="min-h-12 shrink-0 rounded-xl bg-brand px-4 font-semibold text-white" aria-label={t.add}>+</button>
          </div>
          <div className="flex gap-2">
            {!isSale && <input className={inputCls} placeholder={t.quantityPlaceholder} maxLength={40} value={qty} onChange={(e) => setQty(e.target.value)} />}
            {isSale && (
              <input className={inputCls} placeholder={t.pricePlaceholder} type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            )}
          </div>
        </form>
      )}

      {canEdit && !isSale && hasChecked && (
        <button
          className={linkBtnCls}
          onClick={() => void run({ url: `/api/lists/${list.id}/clear-checked`, method: "POST", body: {}, meta: { op: "list-clear", listId: list.id } })}
        >
          {t.clearChecked}
        </button>
      )}

      {canEdit && (
        <button
          className={`${linkBtnCls} !text-danger`}
          onClick={() => {
            if (!confirm(t.confirmDelete)) return;
            void run({ url: `/api/lists/${list.id}`, method: "DELETE", meta: { op: "list-delete", listId: list.id } }).then((ok) => ok && router.replace("/lists"));
          }}
        >
          {t.delete}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
