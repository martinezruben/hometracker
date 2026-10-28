"use client";

import { useCallback, useEffect, useState } from "react";
import type { OutboxItem } from "./db";
import { listOutbox, OUTBOX_EVENT } from "./outbox";

/** Lista reactiva de cambios pendientes en este dispositivo. */
export function useOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const refresh = useCallback(() => {
    listOutbox().then(setItems, () => setItems([]));
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener(OUTBOX_EVENT, refresh);
    return () => window.removeEventListener(OUTBOX_EVENT, refresh);
  }, [refresh]);
  return items;
}
