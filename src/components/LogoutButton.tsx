"use client";

import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { linkBtnCls } from "@/components/ui";
import { clearOutbox } from "@/lib/offline/outbox";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // No dejar datos del usuario en el dispositivo: cola local y cachés del service worker.
    await clearOutbox().catch(() => undefined);
    if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    router.replace("/login");
    router.refresh();
  }
  return <button className={linkBtnCls} onClick={logout}>{es.auth.logout}</button>;
}
