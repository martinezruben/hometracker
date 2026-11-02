"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { nextUp, untilLabel } from "@/lib/home/dial";
import { mutate } from "@/lib/offline/outbox";
import { timeLabel } from "@/lib/tasks/format";
import { ClockIcon } from "@/components/icons";
import { localParts, useNow } from "@/components/home/useNow";
import type { DialTask } from "@/components/home/SkyCard";

/** El siguiente pendiente del día, con la hora que falta y un botón para marcarlo hecho (funciona sin conexión). */
export function NextUpBanner({ open, canEdit }: { open: DialTask[]; canEdit: boolean }) {
  const router = useRouter();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<string | null>(null);
  if (!now) return null;
  const { day, hour } = localParts(now);
  const next = nextUp(open.filter((t) => t.id !== hidden), day, hour);
  if (!next) return null;
  const { task, minutes } = next;
  const when =
    minutes !== null
      ? `${timeLabel(task.dueTime!)} · ${es.nextUp.inTime(untilLabel(minutes))}`
      : task.dueAt && task.dueAt < day
        ? es.nextUp.overdue
        : task.dueTime
          ? timeLabel(task.dueTime)
          : es.nextUp.undated;

  async function complete() {
    setBusy(true);
    try {
      const { queued } = await mutate({ url: `/api/tasks/${task.id}/complete`, method: "POST", body: { dueAt: task.dueAt }, meta: { op: "task-complete", taskId: task.id } });
      setHidden(task.id);
      if (!queued && navigator.onLine) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={es.nextUp.label} className="card flex items-center gap-3 p-3 pl-4">
      <span aria-hidden className="text-mark-task"><ClockIcon width={28} height={28} /></span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] text-muted">{es.nextUp.label} · {when}</p>
        <p className="truncate text-[18px] font-bold">{task.title}</p>
      </div>
      {canEdit && (
        <button
          onClick={complete}
          disabled={busy}
          className="min-h-12 shrink-0 rounded-full bg-dark px-5 text-[16px] font-bold text-card disabled:opacity-60"
        >
          {es.nextUp.done}
        </button>
      )}
    </section>
  );
}
