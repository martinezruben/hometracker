"use client";

import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { linkBtnCls } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return <button className={linkBtnCls} onClick={logout}>{es.auth.logout}</button>;
}
