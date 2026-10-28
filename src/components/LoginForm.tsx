"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { res } = await post("/api/auth/request", { email });
    setBusy(false);
    if (res.ok) setStep("code");
    else setError(res.status === 429 ? es.auth.tooMany : es.auth.genericError);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { res, data } = await post("/api/auth/verify", { email, code });
    if (res.ok) {
      // Quien llega con una invitación va directo a unirse; el resto, sin hogar, crea el suyo.
      const joining = next.startsWith("/join/");
      router.replace(data.hasHousehold || joining ? next : `/onboarding?next=${encodeURIComponent(next)}`);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(res.status === 401 ? es.auth.invalidCode : es.auth.genericError);
  }

  return step === "email" ? (
    <form onSubmit={sendCode} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.auth.emailLabel}</span>
        <input
          className={inputCls}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className={buttonCls} disabled={busy}>{es.auth.sendCode}</button>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.auth.codeLabel}</span>
        <input
          className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <span className="block text-xs text-muted">{es.auth.codeHint}</span>
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className={buttonCls} disabled={busy || code.length !== 6}>{es.auth.verify}</button>
      <button type="button" className={linkBtnCls} onClick={() => { setStep("email"); setCode(""); setError(null); }}>
        {es.auth.changeEmail}
      </button>
    </form>
  );
}
