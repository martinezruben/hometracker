"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function AccountForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setBusy(false);
    setMsg(res.ok ? es.account.saved : es.auth.genericError);
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-3 p-4">
      <h2 className="text-lg font-extrabold">{es.account.title}</h2>
      <p className="text-sm text-muted">{email}</p>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.account.nameLabel}</span>
        <input className={inputCls} required maxLength={120} placeholder={es.account.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button className={buttonCls} disabled={busy || !name.trim() || name.trim() === initialName}>{es.account.save}</button>
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
    </form>
  );
}
