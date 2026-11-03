"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { AI_MODELS } from "@/lib/vision/models";
import { buttonCls, inputCls } from "@/components/ui";

export type AiStatusView = { model: string; source: "household" | "server" | null; last4: string | null; unreadable: boolean };
const t = es.ai;

/**
 * Ajustes de IA (solo administradores). Usa `fetch` directo y no la cola sin conexión: una clave nunca debe quedar
 * guardada en el dispositivo mientras espera red.
 */
export function AiSettingsForm({ initial }: { initial: AiStatusView }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function call(url: string, init: RequestInit) {
    try {
      return await fetch(url, { ...init, headers: { "content-type": "application/json" } });
    } catch {
      return null;
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setMsg(null);
    const res = await call("/api/ai-settings", { method: "PUT", body: JSON.stringify({ model, ...(apiKey.trim() ? { apiKey } : {}) }) });
    setBusy(null);
    if (!res) return setMsg({ text: t.needsConnection, error: true });
    if (res.status === 400) return setMsg({ text: t.invalidKey, error: true });
    if (!res.ok) return setMsg({ text: es.auth.genericError, error: true });
    setStatus(await res.json());
    setApiKey("");
    setMsg({ text: t.saved, error: false });
    router.refresh();
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    const res = await call("/api/ai-settings/test", { method: "POST", body: JSON.stringify({ model, ...(apiKey.trim() ? { apiKey } : {}) }) });
    setBusy(null);
    if (!res) return setMsg({ text: t.needsConnection, error: true });
    const data = await res.json().catch(() => ({}));
    if (data.ok) return setMsg({ text: t.testOk(AI_MODELS.find((m) => m.id === data.model)?.name ?? data.model), error: false });
    const key = data.error as keyof typeof t.testErrors;
    setMsg({ text: t.testErrors[key] ?? es.auth.genericError, error: true });
  }

  async function remove() {
    setBusy("remove");
    setMsg(null);
    const res = await call("/api/ai-settings", { method: "DELETE" });
    setBusy(null);
    if (!res?.ok) return setMsg({ text: res ? es.auth.genericError : t.needsConnection, error: true });
    setStatus(await res.json());
    setMsg({ text: t.removed, error: false });
    router.refresh();
  }

  const statusText = status.unreadable ? t.statusUnreadable : status.source === "household" ? t.statusHousehold(status.last4 ?? "") : status.source === "server" ? t.statusServer : t.statusNone;
  const on = status.source !== null && !status.unreadable;

  return (
    <form onSubmit={save} className="card space-y-4 p-4" aria-label={t.title} role="form">
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold">{t.title}</h2>
        <p className="text-sm text-muted">{t.intro}</p>
        <p className="flex items-center gap-2 pt-1 text-sm font-bold">
          <span aria-hidden className={`size-2.5 rounded-full ${on ? "bg-ok-bar" : "bg-soon-bar"}`} />
          {statusText}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-muted">{t.keyLabel}</span>
        <input
          className={inputCls}
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={400}
          placeholder={t.keyPlaceholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <span className="block text-xs text-muted">{t.keyHint}</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm text-muted">{t.modelLabel}</legend>
        {AI_MODELS.map((m) => (
          <label key={m.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-3 ${model === m.id ? "border-primary bg-tile" : "border-border"}`}>
            <input type="radio" name="ai-model" className="mt-1 size-5" value={m.id} checked={model === m.id} onChange={() => setModel(m.id)} />
            <span className="leading-tight">
              <span className="block font-extrabold">{m.name}</span>
              <span className="block text-sm text-muted">{m.hint}</span>
              <span className="block text-xs text-muted">{m.price}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <button className={buttonCls} disabled={busy !== null}>{t.save}</button>
      <div className="flex gap-3">
        <button type="button" onClick={test} disabled={busy !== null} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-primary font-bold text-link disabled:opacity-60">
          {busy === "test" ? t.testing : t.test}
        </button>
        {status.source === "household" && (
          <button type="button" onClick={remove} disabled={busy !== null} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-border font-bold text-danger disabled:opacity-60">
            {t.remove}
          </button>
        )}
      </div>
      {msg && <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-danger" : "text-muted"}`}>{msg.text}</p>}
    </form>
  );
}
