"use client";

import { useRef, useState } from "react";
import { es } from "@/lib/i18n/es";
import { compressPhoto } from "@/lib/image";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

type Detected = { key: string; title: string; quantity: number; category: string | null; confidence: "alta" | "media" | "baja" };
export type NewAiItem = { id: string; title: string; quantity: number; category: string | null };

const t = es.boxes.aiDetect;

/**
 * Foto → objetos detectados → revisión → confirmar. El servidor solo devuelve la lista; aquí la persona
 * corrige o quita y, al confirmar, `onConfirm` crea los objetos con la cola de siempre (marcados como IA).
 */
export function AiDetect({ boxId, onConfirm }: { boxId: string; onConfirm: (items: NewAiItem[]) => Promise<void> }) {
  const [phase, setPhase] = useState<"idle" | "analyzing" | "review">("idle");
  const [rows, setRows] = useState<Detected[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function analyze(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (!navigator.onLine) return setMessage(t.needsConnection);
    setPhase("analyzing");
    try {
      const { blob } = await compressPhoto(file);
      const form = new FormData();
      form.append("file", blob, "caja.jpg");
      const res = await fetch(`/api/boxes/${boxId}/analyze`, { method: "POST", body: form });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
        const errors = t.errors as Record<string, string>;
        setMessage(errors[code] ?? t.errors.generic);
        return setPhase("idle");
      }
      const data = (await res.json()) as { items: Omit<Detected, "key">[] };
      if (data.items.length === 0) {
        setMessage(t.empty);
        return setPhase("idle");
      }
      setRows(data.items.map((i) => ({ ...i, key: newId() })));
      setPhase("review");
    } catch {
      setMessage(t.errors.generic);
      setPhase("idle");
    }
  }

  const patch = (key: string, change: Partial<Detected>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...change } : x)));
  const valid = rows.filter((r) => r.title.trim());

  async function confirm() {
    setSaving(true);
    try {
      await onConfirm(valid.map((r) => ({ id: newId(), title: r.title.trim(), quantity: Math.max(1, Math.min(9999, Math.floor(r.quantity) || 1)), category: r.category?.trim() || null })));
      setMessage(t.added(valid.length));
      setRows([]);
      setPhase("idle");
    } catch {
      setMessage(es.auth.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4" data-testid="ai-detect">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void analyze(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => { void analyze(e.target.files?.[0]); e.target.value = ""; }} />

      {phase !== "review" && (
        <>
          <div>
            <h3 className="font-extrabold">{t.button}</h3>
            <p className="text-sm text-muted">{t.hint}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={buttonCls} disabled={phase === "analyzing"} onClick={() => cameraRef.current?.click()}>{t.camera}</button>
            <button type="button" className="min-h-12 rounded-2xl border border-border font-bold disabled:opacity-60" disabled={phase === "analyzing"} onClick={() => galleryRef.current?.click()}>{t.gallery}</button>
          </div>
          {phase === "analyzing" && <p role="status" className="text-sm text-muted">{t.analyzing}</p>}
        </>
      )}

      {phase === "review" && (
        <>
          <div>
            <h3 className="font-extrabold">{t.reviewTitle}</h3>
            <p className="text-sm text-muted">{t.reviewHint}</p>
          </div>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.key} className="space-y-2 rounded-2xl bg-tile p-3">
                <div className="flex gap-2">
                  <input className={inputCls} aria-label={t.titleLabel} maxLength={200} value={r.title} onChange={(e) => patch(r.key, { title: e.target.value })} />
                  <button type="button" aria-label={`${t.remove} ${r.title}`} className="min-h-12 min-w-11 text-xl text-muted" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>×</button>
                </div>
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <input className={inputCls} aria-label={es.boxes.quantityLabel} type="number" inputMode="numeric" min="1" max="9999" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} />
                  <input className={inputCls} aria-label={es.boxes.categoryLabel} list="box-categories" maxLength={80} value={r.category ?? ""} onChange={(e) => patch(r.key, { category: e.target.value })} />
                </div>
                {r.confidence === "baja" && <p className="text-xs font-semibold text-soon">{t.lowConfidence}</p>}
              </li>
            ))}
          </ul>
          <button type="button" className={buttonCls} disabled={saving || valid.length === 0} onClick={() => void confirm()}>{t.add(valid.length)}</button>
          <button type="button" className={linkBtnCls} onClick={() => { setRows([]); setPhase("idle"); }}>{t.discard}</button>
        </>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </div>
  );
}
