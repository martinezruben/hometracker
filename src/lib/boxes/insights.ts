/** Datos derivados de una caja: reparto por categoría y su línea de tiempo (puro, con pruebas). */
import type { TimelineEvent } from "@/lib/timeline";

type ItemLike = { id: string; title: string; quantity: number; category: string | null; createdAt: Date };
type PhotoLike = { id: string; createdAt: Date };

export type CategoryShare = { category: string | null; units: number; pct: number };

/** Unidades por categoría, de mayor a menor; "sin categoría" (null) al final. `pct` suma 100 con el redondeo ajustado. */
export function categoryBreakdown(items: Pick<ItemLike, "quantity" | "category">[]): CategoryShare[] {
  const totals = new Map<string | null, number>();
  for (const i of items) {
    const key = i.category?.trim() || null;
    totals.set(key, (totals.get(key) ?? 0) + i.quantity);
  }
  const all = [...totals.values()].reduce((n, v) => n + v, 0);
  if (all === 0) return [];
  const rows = [...totals.entries()]
    .map(([category, units]) => ({ category, units, pct: Math.round((units / all) * 100) }))
    .sort((a, b) => (a.category === null ? 1 : b.category === null ? -1 : b.units - a.units || String(a.category).localeCompare(String(b.category))));
  const diff = 100 - rows.reduce((n, r) => n + r.pct, 0);
  rows[0].pct += diff; // el redondeo no debe dejar 99 o 101
  return rows;
}

/** Creación de la caja, objetos agregados y fotos, del más reciente al más antiguo (máx. `limit`). */
export function buildBoxTimeline(
  box: { id: string; createdAt: Date },
  items: ItemLike[],
  photos: PhotoLike[],
  text: { created: string; itemAdded: (title: string, qty: number) => string; photoAdded: string },
  limit = 12,
): TimelineEvent[] {
  const ev: TimelineEvent[] = [
    { id: "created", at: box.createdAt, kind: "created", tone: "info", title: text.created },
    ...items.map((i) => ({ id: `i-${i.id}`, at: i.createdAt, kind: "item" as const, tone: "ok" as const, title: text.itemAdded(i.title, i.quantity), detail: i.category ?? undefined })),
    ...photos.map((p) => ({ id: `p-${p.id}`, at: p.createdAt, kind: "photo" as const, tone: "info" as const, title: text.photoAdded })),
  ];
  return ev.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
