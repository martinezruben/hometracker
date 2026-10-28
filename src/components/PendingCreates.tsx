"use client";

import type { OutboxMeta } from "@/lib/offline/db";
import { useOutbox } from "@/lib/offline/useOutbox";

/** Elementos creados sin conexión que aún no llegaron al servidor. */
export function PendingCreates({ op, hint }: { op: OutboxMeta["op"]; hint: string }) {
  const creates = useOutbox().filter((i) => i.meta.op === op && !i.error);
  if (!creates.length) return null;
  return (
    <ul className="space-y-3">
      {creates.map((c) => (
        <li key={c.seq} className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3">
          <div className="size-16 shrink-0 rounded-lg bg-border" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.meta.name}</p>
            <p className="text-sm text-muted">{hint}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
