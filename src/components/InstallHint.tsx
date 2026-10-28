"use client";

import { useEffect, useState } from "react";
import { es } from "@/lib/i18n/es";
import { isIos, isStandalone } from "@/lib/push/client";
import { linkBtnCls } from "@/components/ui";

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
    <aside className="space-y-2 card border border-primary p-4">
      <h2 className="font-semibold">{es.install.title}</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {es.install.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <button
        className={linkBtnCls}
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
