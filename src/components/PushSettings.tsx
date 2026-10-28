"use client";

import { useEffect, useState } from "react";
import { es } from "@/lib/i18n/es";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push/client";
import { buttonCls, linkBtnCls } from "@/components/ui";

const t = es.push;

export function PushSettings() {
  const [state, setState] = useState<PushState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushState().then(
      (s) => alive && setState(s),
      () => alive && setState("unsupported"),
    );
    return () => {
      alive = false;
    };
  }, []);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    if (!res.ok) return setMessage(res.status === 503 ? t.notConfigured : t.error);
    const { sent } = await res.json();
    setMessage(sent > 0 ? t.testSent : t.testNone);
  }

  const note: Partial<Record<PushState, string>> = {
    unsupported: t.unsupported,
    "not-configured": t.notConfigured,
    "install-first": t.installFirst,
    denied: t.denied,
  };

  return (
    <section className="space-y-3 card p-4">
      <h2 className="font-semibold">{t.title}</h2>
      <p className="text-sm text-muted">{t.description}</p>
      {state === "loading" ? null : note[state] ? (
        <p className="text-sm">{note[state]}</p>
      ) : (
        <>
          {state === "on" && <p className="text-sm">{t.enabled}</p>}
          <button className={buttonCls} disabled={busy} onClick={toggle}>
            {state === "on" ? t.disable : t.enable}
          </button>
          {state === "on" && (
            <button className={linkBtnCls} onClick={sendTest}>{t.test}</button>
          )}
        </>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </section>
  );
}
