"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushOutbox } from "@/lib/offline/outbox";

/** Vacía la cola al abrir la app, al reconectar y al volver a primer plano (iOS no tiene sync en segundo plano). */
export function SyncManager() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!navigator.onLine) return;
      try {
        const sent = await flushOutbox();
        if (alive && sent > 0) router.refresh();
      } catch {
        /* IndexedDB no disponible: la app sigue funcionando en línea */
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void run();
    void run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(run, 30_000);
    return () => {
      alive = false;
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [router]);
  return null;
}
