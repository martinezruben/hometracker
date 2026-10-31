"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";
import { fontsReady, renderLabel, renderSheets, type LabelItem } from "@/lib/labels/render";
import { CUSTOM_ID, CUSTOM_MAX, CUSTOM_MIN, PRESETS, SHEET, fileName, repeatEach, resolveSize } from "@/lib/labels/sizes";

export type LabelGroup = { title?: string; items: LabelItem[] };

const STORE = "ht-label-prefs";

type Prefs = { sizeId: string; w: number; h: number; showText: boolean; copies: number };
const DEFAULTS: Prefs = { sizeId: "50x30", w: 50, h: 50, showText: true, copies: 1 };

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const noopSubscribe = () => () => {};
const rawPrefs = () => {
  try {
    return localStorage.getItem(STORE) ?? "";
  } catch {
    return "";
  }
};
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {}
  listeners.forEach((cb) => cb());
}
function parsePrefs(raw: string): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(raw || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Imprime las imágenes a tamaño real desde un iframe oculto (no depende del resto de la pantalla). */
function printImages(images: string[], wMm: number, hMm: number, pageSize: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  const imgs = images
    .map((src, i) => `<img src="${src}" style="width:${wMm}mm;height:${hMm}mm;display:block;${i < images.length - 1 ? "break-after:page;" : ""}">`)
    .join("");
  iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${pageSize};margin:0}html,body{margin:0;padding:0;background:#fff}</style></head><body>${imgs}</body></html>`;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    const done = () => setTimeout(() => iframe.remove(), 1000);
    win.addEventListener("afterprint", done);
    win.focus();
    win.print();
    setTimeout(done, 60_000);
  };
  document.body.appendChild(iframe);
}

export function LabelStudio({ groups }: { groups: LabelGroup[] }) {
  const raw = useSyncExternalStore(subscribe, rawPrefs, () => "");
  const prefs = useMemo(() => parsePrefs(raw), [raw]);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const size = useMemo(() => resolveSize(prefs.sizeId, prefs.w, prefs.h), [prefs.sizeId, prefs.w, prefs.h]);
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const opt = useMemo(() => ({ showText: prefs.showText, hint: es.labels.hint }), [prefs.showText]);
  const copies = Math.min(100, Math.max(1, Math.floor(prefs.copies) || 1));

  // Vista previa de cada etiqueta con el tamaño elegido.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      await fontsReady();
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const item of all) next[item.id] = renderLabel(item, size, opt);
      setPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, all, size, opt]);

  async function printAll() {
    setBusy(true);
    await fontsReady();
    const items = repeatEach(all, copies);
    if (size.sheet) printImages(renderSheets(items, opt), SHEET.pageW, SHEET.pageH, "A4");
    else printImages(items.map((i) => renderLabel(i, size, opt)), size.w, size.h, `${size.w}mm ${size.h}mm`);
    setBusy(false);
  }

  async function downloadOne(item: LabelItem) {
    await fontsReady();
    if (size.sheet) {
      renderSheets(repeatEach([item], copies), opt).forEach((img, i) => download(img, fileName(`${item.title}${i ? `-${i + 1}` : ""}`, size)));
    } else {
      download(renderLabel(item, size, opt), fileName(item.title, size));
    }
  }

  const set = (p: Partial<Prefs>) => savePrefs({ ...prefs, ...p });
  const isCustom = prefs.sizeId === CUSTOM_ID;
  const total = all.length * copies;

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <label className="block space-y-1">
          <span className="text-sm text-muted">{es.labels.sizeLabel}</span>
          <select className={inputCls} value={prefs.sizeId} onChange={(e) => set({ sizeId: e.target.value })}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value={CUSTOM_ID}>{es.labels.custom}</option>
          </select>
        </label>
        {isCustom && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm text-muted">{es.labels.customW}</span>
              <input className={inputCls} type="number" inputMode="numeric" min={CUSTOM_MIN} max={CUSTOM_MAX} value={prefs.w} onChange={(e) => set({ w: Number(e.target.value) })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">{es.labels.customH}</span>
              <input className={inputCls} type="number" inputMode="numeric" min={CUSTOM_MIN} max={CUSTOM_MAX} value={prefs.h} onChange={(e) => set({ h: Number(e.target.value) })} />
            </label>
          </div>
        )}
        <div className="grid grid-cols-2 items-end gap-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5" checked={prefs.showText} onChange={(e) => set({ showText: e.target.checked })} />
            <span className="text-sm">{es.labels.includeText}</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">{es.labels.copies}</span>
            <input className={inputCls} type="number" inputMode="numeric" min={1} max={100} value={prefs.copies} onChange={(e) => set({ copies: Number(e.target.value) })} />
          </label>
        </div>
        <button className={`${buttonCls} w-full`} disabled={busy || all.length === 0} onClick={printAll}>
          {busy ? es.labels.preparing : `${es.labels.print} (${es.labels.pages(total)})`}
        </button>
        <p className="text-xs text-muted">{es.labels.note}</p>
      </div>

      {all.length === 0 && <p className="text-sm text-muted">{es.labels.empty}</p>}
      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <section key={g.title ?? "items"} className="space-y-2">
            {g.title && <h2 className="text-lg font-extrabold">{g.title}</h2>}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {g.items.map((item) => (
                <li key={item.id} className="card space-y-3 p-3">
                  <div className="flex min-h-24 items-center justify-center rounded-xl bg-tile p-3">
                    {previews[item.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[item.id]} alt={`${es.labels.title}: ${item.title}`} className="max-h-60 max-w-full border border-border bg-white shadow-sm" style={{ aspectRatio: `${size.w} / ${size.h}` }} />
                    ) : (
                      <span className="text-sm text-muted">{es.labels.preparing}</span>
                    )}
                  </div>
                  <button className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-primary font-bold text-link" onClick={() => downloadOne(item)}>
                    {size.sheet ? es.labels.downloadSheet : es.labels.download}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
