"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls } from "@/components/ui";

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/households", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(es.auth.genericError);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.onboarding.nameLabel}</span>
        <input
          className={inputCls}
          required
          maxLength={120}
          placeholder={es.onboarding.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className={buttonCls} disabled={busy || !name.trim()}>{es.onboarding.create}</button>
      <p className="text-sm text-muted">{es.onboarding.inviteHint}</p>
    </form>
  );
}
