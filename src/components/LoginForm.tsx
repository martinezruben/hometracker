"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      // Quien llega con una invitación va directo a unirse; el resto, sin hogar, crea el suyo.
      const joining = next.startsWith("/join/");
      router.replace(data.hasHousehold || joining ? next : `/onboarding?next=${encodeURIComponent(next)}`);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(
      res?.status === 401 ? es.auth.invalidCredentials
        : res?.status === 409 ? es.auth.emailTaken
        : res?.status === 429 ? es.auth.tooMany
        : es.auth.genericError,
    );
  }

  const registering = mode === "register";
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.auth.emailLabel}</span>
        <input
          className={inputCls}
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.auth.passwordLabel}</span>
        <input
          className={inputCls}
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          required
          minLength={registering ? 8 : undefined}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {registering && <span className="block text-xs text-muted">{es.auth.passwordHint}</span>}
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className={buttonCls} disabled={busy}>{registering ? es.auth.register : es.auth.login}</button>
      <button
        type="button"
        className={linkBtnCls}
        onClick={() => { setMode(registering ? "login" : "register"); setError(null); }}
      >
        {registering ? es.auth.toLogin : es.auth.toRegister}
      </button>
    </form>
  );
}
