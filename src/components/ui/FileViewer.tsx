"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { es } from "@/lib/i18n/es";

const t = es.viewer;
const MIN = 1;
const MAX = 5;
const STEP = 0.5;

/**
 * Visor en modal para fotos y PDF con zoom (botones, doble toque/clic y Ctrl + rueda).
 * Las fotos se amplían cambiando su ancho dentro de un contenedor con scroll; los PDF se dibujan página a página
 * con pdf.js (cargado solo al abrir uno) y se redibujan nítidos al cambiar el zoom.
 */
export function FileViewer({ url, mime, title, onClose }: { url: string; mime: string; title: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isPdf = mime === "application/pdf";

  const change = useCallback((next: number) => setZoom(Math.min(MAX, Math.max(MIN, Math.round(next * 100) / 100))), []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(MAX, z + STEP));
      else if (e.key === "-") setZoom((z) => Math.max(MIN, z - STEP));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  const btn = "flex size-11 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white disabled:opacity-40";

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex flex-col bg-black/90 text-white" data-testid="file-viewer">
      <div className="flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <p className="min-w-0 flex-1 truncate font-bold">{title}</p>
        <button type="button" className={btn} aria-label={t.zoomOut} disabled={zoom <= MIN} onClick={() => change(zoom - STEP)}>−</button>
        <button type="button" className="min-h-11 min-w-14 rounded-full bg-white/15 px-3 text-sm font-bold" aria-label={t.reset} onClick={() => change(1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" className={btn} aria-label={t.zoomIn} disabled={zoom >= MAX} onClick={() => change(zoom + STEP)}>+</button>
        <button ref={closeRef} type="button" className={btn} aria-label={t.close} onClick={onClose}>×</button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            change(zoom - Math.sign(e.deltaY) * 0.25);
          }
        }}
      >
        {isPdf ? (
          <PdfPages url={url} zoom={zoom} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            draggable={false}
            onDoubleClick={() => change(zoom > 1 ? 1 : 2.5)}
            style={{ width: `${zoom * 100}%`, maxWidth: "none", margin: "0 auto", display: "block", objectFit: "contain" }}
            className="select-none"
          />
        )}
      </div>
      <div className="flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
        <a href={url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm font-semibold text-white/80 underline">{t.openNew}</a>
      </div>
    </div>
  );
}

type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;

function PdfPages({ url, zoom }: { url: string; zoom: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch");
        const loading = pdfjs.getDocument({ data: new Uint8Array(await res.arrayBuffer()) });
        task = loading;
        const loaded = await loading.promise;
        if (cancelled) return;
        setDoc(loaded);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redibuja con el zoom (con un pequeño retardo para no repintar en cada paso).
  useEffect(() => {
    if (!doc || !width) return;
    let cancelled = false;
    const tasks: { cancel: () => void }[] = [];
    const timer = setTimeout(async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = (width * zoom) / base.width;
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvases.current[n - 1];
        if (!canvas) continue;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const task = page.render({ canvas, viewport });
        tasks.push(task);
        try {
          await task.promise;
        } catch {
          /* cancelado por un nuevo zoom */
        }
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      tasks.forEach((x) => x.cancel());
    };
  }, [doc, width, zoom]);

  return (
    <div ref={wrap} className="w-full">
      {status === "loading" && <p role="status" className="p-6 text-center text-white/80">{t.loading}</p>}
      {status === "error" && <p role="alert" className="p-6 text-center text-white/80">{t.error}</p>}
      {doc && (
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-3 py-3" data-testid="pdf-pages">
          {Array.from({ length: doc.numPages }, (_, i) => (
            <canvas key={i} ref={(el) => { canvases.current[i] = el; }} className="bg-white" aria-label={t.page(i + 1, doc.numPages)} />
          ))}
        </div>
      )}
    </div>
  );
}
