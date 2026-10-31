"use client";

import { useState } from "react";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function PasswordForm() {
  const [confirm, setConfirm] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setMsg({ text: es.account.passwordMismatch, error: true });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setConfirm("");
      setNext("");
      setMsg({ text: es.account.passwordChanged, error: false });
    } else {
      setMsg({
        text: es.auth.genericError,
        error: true,
      });
    }
  }

  return (
    <form onSubmit={save} className="card space-y-3 p-4">
      <h2 className="text-lg font-extrabold">{es.account.passwordTitle}</h2>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.account.newPassword}</span>
        <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="block text-xs text-muted">{es.account.passwordHint}</span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.account.confirmPassword}</span>
        <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <button className={buttonCls} disabled={busy || next.length < 8 || !confirm}>{es.account.changePassword}</button>
      {msg && (
        <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-danger" : "text-muted"}`}>{msg.text}</p>
      )}
    </form>
  );
}
