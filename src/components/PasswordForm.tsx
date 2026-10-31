"use client";

import { useState } from "react";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current, next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setCurrent("");
      setNext("");
      setMsg({ text: es.account.passwordChanged, error: false });
    } else {
      setMsg({
        text: res?.status === 401 ? es.account.wrongPassword : res?.status === 429 ? es.auth.tooMany : es.auth.genericError,
        error: true,
      });
    }
  }

  return (
    <form onSubmit={save} className="card space-y-3 p-4">
      <h2 className="text-lg font-extrabold">{es.account.passwordTitle}</h2>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.account.currentPassword}</span>
        <input className={inputCls} type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.account.newPassword}</span>
        <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="block text-xs text-muted">{es.account.passwordHint}</span>
      </label>
      <button className={buttonCls} disabled={busy || !current || next.length < 8}>{es.account.changePassword}</button>
      {msg && (
        <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-danger" : "text-muted"}`}>{msg.text}</p>
      )}
    </form>
  );
}
