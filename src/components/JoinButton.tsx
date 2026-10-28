"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls } from "@/components/ui";

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(es.invite.invalid);
  }

  return (
    <div className="space-y-3">
      <button className={buttonCls} disabled={busy} onClick={join}>{es.invite.joinAction}</button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
