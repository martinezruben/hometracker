"use client";

import { es } from "@/lib/i18n/es";
import { useOutbox } from "@/lib/offline/useOutbox";

/** Cajas creadas sin conexión que aún no llegaron al servidor. */
export function PendingBoxes() {
  const creates = useOutbox().filter((i) => i.meta.op === "box-create" && !i.error);
  if (!creates.length) return null;
  return (
    <ul className="space-y-3">
      {creates.map((c) => (
        <li key={c.seq} className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3">
          <div className="size-16 shrink-0 rounded-lg bg-border" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.meta.name}</p>
            <p className="text-sm text-muted">{es.sync.pendingBox}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
