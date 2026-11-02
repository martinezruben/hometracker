"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 15_000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Hora del dispositivo, actualizada cada minuto. En el servidor (y al hidratar) devuelve `null` para no pintar
 * una hora equivocada: los componentes muestran entonces un estado neutro.
 */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60_000), () => -1);
  return minute < 0 ? null : new Date(minute * 60_000);
}

/** Día local (YYYY-MM-DD) y hora decimal de un instante, según la zona horaria del dispositivo. */
export function localParts(d: Date): { day: string; hour: number } {
  const p = (n: number) => String(n).padStart(2, "0");
  return { day: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hour: d.getHours() + d.getMinutes() / 60 };
}
