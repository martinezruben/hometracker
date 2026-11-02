"use client";

import { useEffect, useState } from "react";
import { es } from "@/lib/i18n/es";
import { isIos, isStandalone } from "@/lib/push/client";
import { BellIcon } from "@/components/icons";
import { IconTile } from "@/components/ui/IconTile";

const KEY = "ht-install-dismissed";

/** Guía para instalar la app en iPhone: sin instalarla no hay notificaciones. */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      /* almacenamiento bloqueado: se muestra igual */
    }
    // Se difiere para no actualizar estado de forma síncrona dentro del efecto.
    const id = setTimeout(() => setShow(isIos() && !isStandalone() && !dismissed), 0);
    return () => clearTimeout(id);
  }, []);

  if (!show) return null;
  return (
    <aside className="card space-y-3 border border-primary/40 p-4">
      <div className="flex items-center gap-3">
        <IconTile tint="blue"><BellIcon width={22} height={22} /></IconTile>
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold leading-tight">{es.install.title}</h2>
          <p className="text-[13px] text-muted">{es.install.subtitle}</p>
        </div>
      </div>
      <ol className="space-y-2">
        {es.install.steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 rounded-2xl bg-tile p-3 text-[14px] leading-snug">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <button
        className="flex min-h-11 items-center text-sm font-bold text-link"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignorar */
          }
          setShow(false);
        }}
      >
        {es.install.dismiss}
      </button>
    </aside>
  );
}
