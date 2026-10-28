"use client";

import { es } from "@/lib/i18n/es";
import { discardFailed } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";

export function SyncStatus() {
  const items = useOutbox();
  const failed = items.filter((i) => i.error).length;
  const pending = items.length - failed;
  if (!pending && !failed) return null;
  return (
    <div role="status" className="space-y-1 bg-sky-100 px-4 py-2 text-sm text-sky-900">
      {pending > 0 && <p>{es.sync.pending(pending)}</p>}
      {failed > 0 && (
        <p>
          {es.sync.failed(failed)}{" "}
          <button className="underline" onClick={() => void discardFailed()}>{es.sync.discard}</button>
        </p>
      )}
    </div>
  );
}
