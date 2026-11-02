"use client";

import { useNow } from "@/components/home/useNow";

/** "Lunes, 2 nov" con la fecha del dispositivo (en el servidor, vacío para no desajustar la hidratación). */
export function TodayLabel() {
  const now = useNow();
  if (!now) return <span>&nbsp;</span>;
  const s = now.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }).replace(".", "");
  return <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
}
