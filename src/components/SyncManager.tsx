"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushOutbox, listOutbox } from "@/lib/offline/outbox";

const REFRESH_MS = 60_000;

/**
 * Vacía la cola al abrir la app, al reconectar y al volver a primer plano (iOS no tiene sync en segundo plano).
 * Además refresca los datos cada minuto mientras la app está visible, para ver los cambios de otros miembros.
 */
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
    let lastRefresh = Date.now();
    const refreshIfIdle = async () => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < REFRESH_MS) return;
      // Con cambios pendientes no se refresca: primero se envían (run) y luego se recarga.
      const pending = await listOutbox().catch(() => []);
      if (pending.some((i) => !i.error)) return;
      lastRefresh = Date.now();
      if (alive) router.refresh();
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void run().then(refreshIfIdle);
    };
    void run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void run().then(refreshIfIdle), 30_000);
    return () => {
      alive = false;
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [router]);
  return null;
}
