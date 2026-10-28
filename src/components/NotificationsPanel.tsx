"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push/client";
import type { PrefType } from "@/lib/notifications/prefs";
import { BellIcon, CalendarIcon, ListIcon, ShieldIcon, WrenchIcon } from "@/components/icons";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { Switch } from "@/components/ui/Switch";
import { buttonCls, linkBtnCls } from "@/components/ui";

const t = es.reminders;
const rows: { type: PrefType; tint: Tint; Icon: typeof BellIcon }[] = [
  { type: "maintenance", tint: "blue", Icon: WrenchIcon },
  { type: "warranty", tint: "purple", Icon: ShieldIcon },
  { type: "tasks", tint: "green", Icon: ListIcon },
  { type: "weekly", tint: "yellow", Icon: CalendarIcon },
];

export function NotificationsPanel({ initial }: { initial: Record<PrefType, boolean> }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
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

  async function toggle(type: PrefType, enabled: boolean) {
    setPrefs((p) => ({ ...p, [type]: enabled }));
    setMessage(null);
    const res = await fetch("/api/notification-prefs", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, enabled }) }).catch(() => null);
    if (!res?.ok) {
      setPrefs((p) => ({ ...p, [type]: !enabled }));
      setMessage(t.prefsError);
    }
  }

  async function activate() {
    setBusy(true);
    setMessage(null);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setMessage(es.push.error);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    if (!res.ok) return setMessage(res.status === 503 ? es.push.notConfigured : es.push.error);
    const { sent } = await res.json();
    setMessage(sent > 0 ? es.push.testSent : es.push.testNone);
  }

  const note: Partial<Record<PushState, string>> = {
    unsupported: es.push.unsupported,
    "not-configured": es.push.notConfigured,
    "install-first": es.push.installFirst,
    denied: es.push.denied,
  };

  return (
    <div className="space-y-5">
      {/* Vista previa de cómo llega el aviso */}
      <div className="card flex items-start gap-3 p-3.5" aria-hidden>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><BellIcon width={20} height={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-xs text-muted"><span>{t.preview.app}</span><span>{t.preview.when}</span></div>
          <p className="font-extrabold">{t.preview.title}</p>
          <p className="text-sm text-muted">{t.preview.body}</p>
        </div>
      </div>

      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-card text-link shadow-[0_6px_20px_rgb(15_27_61/0.1)]"><BellIcon width={34} height={34} /></span>
        <h1 className="text-[28px] font-extrabold leading-tight">{t.title}</h1>
        <p className="text-muted">{t.text}</p>
      </div>

      <ul className="card divide-y divide-border">
        {rows.map(({ type, tint, Icon }) => (
          <li key={type} className="flex items-center gap-3 p-3.5">
            <IconTile tint={tint}><Icon width={22} height={22} /></IconTile>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{t.items[type].title}</p>
              <p className="text-sm text-muted">{t.items[type].sub}</p>
            </div>
            <Switch checked={prefs[type]} onChange={(v) => void toggle(type, v)} label={t.items[type].title} />
          </li>
        ))}
      </ul>

      {state !== "loading" && note[state] && <p className="card p-4 text-sm">{note[state]}</p>}
      {state !== "loading" && !note[state] && (
        <button className={buttonCls} disabled={busy} onClick={activate}>
          {state === "on" ? es.push.disable : t.activate}
        </button>
      )}
      {state === "on" && (
        <>
          <p className="text-center text-sm text-muted">{es.push.enabled}</p>
          <button className={`${linkBtnCls} mx-auto flex items-center`} onClick={sendTest}>{es.push.test}</button>
        </>
      )}
      <button className={`${linkBtnCls} mx-auto flex items-center justify-center text-[15px]`} onClick={() => router.push("/")}>{t.notNow}</button>
      {message && <p role="status" className="text-center text-sm text-muted">{message}</p>}
    </div>
  );
}

