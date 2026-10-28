"use client";

import { useSyncExternalStore } from "react";
import { es } from "@/lib/i18n/es";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="bg-amber-100 text-amber-900 text-sm px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      {es.sync.offline}
    </div>
  );
}
