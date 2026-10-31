"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function HouseholdNameForm({ householdId, initialName }: { householdId: string; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/households/${householdId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    setBusy(false);
    setMsg(res?.ok ? { text: es.account.saved, error: false } : { text: es.auth.genericError, error: true });
    if (res?.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-3 p-4">
      <h2 className="text-lg font-extrabold">{es.household.title}</h2>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.household.nameLabel}</span>
        <input className={inputCls} required maxLength={120} placeholder={es.onboarding.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button className={buttonCls} disabled={busy || !name.trim() || name.trim() === initialName}>{es.account.save}</button>
      {msg && <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-danger" : "text-muted"}`}>{msg.text}</p>}
    </form>
  );
}
