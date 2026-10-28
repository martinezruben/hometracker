"use client";

import { useSyncExternalStore } from "react";
import { es } from "@/lib/i18n/es";

const noop = () => () => undefined;

/** Saludo según la hora del dispositivo (en el servidor se usa un saludo neutro para no desajustar la hidratación). */
export function Greeting() {
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => -1);
  const text = hour < 0 ? "Hola" : hour < 12 ? es.greeting.morning : hour < 19 ? es.greeting.afternoon : es.greeting.evening;
  return <span>{text},</span>;
}
