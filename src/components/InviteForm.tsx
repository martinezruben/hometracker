"use client";

import { useState } from "react";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function InviteForm({ householdId }: { householdId: string }) {
  const [role, setRole] = useState("member");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCopied(false);
    const res = await fetch(`/api/households/${householdId}/invitations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) setUrl((await res.json()).url);
    else setError(es.auth.genericError);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <form onSubmit={create} className="space-y-3 card p-4">
      <h2 className="font-semibold">{es.invite.title}</h2>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.invite.roleLabel}</span>
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="member">{es.invite.roles.member}</option>
          <option value="viewer">{es.invite.roles.viewer}</option>
          <option value="admin">{es.invite.roles.admin}</option>
        </select>
      </label>
      <button className={buttonCls}>{es.invite.create}</button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {url && (
        <div className="space-y-2">
          <input readOnly className={inputCls} value={url} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className={buttonCls} onClick={copy}>
            {copied ? es.invite.copied : es.invite.copy}
          </button>
          <p className="text-xs text-muted">{es.invite.expiresHint}</p>
        </div>
      )}
    </form>
  );
}
