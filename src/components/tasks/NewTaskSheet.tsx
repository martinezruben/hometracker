"use client";

import { useEffect, useRef, useState } from "react";
import { es } from "@/lib/i18n/es";
import { todayInput } from "@/lib/format";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls } from "@/components/ui";
import { Switch } from "@/components/ui/Switch";
import type { Person } from "@/components/tasks/TaskRow";

const t = es.tasks;
export type NewTask = { id: string; title: string; dueAt: string | null; dueTime: string | null; repeatRule: string | null; assignedTo: string | null; urgent: boolean; category: string | null };

/** Hoja inferior para crear un pendiente (diálogo modal: Escape y el fondo la cierran). */
export function NewTaskSheet({ people, currentUserId, onSubmit, onClose }: { people: Person[]; currentUserId: string; onSubmit: (t: NewTask) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [repeat, setRepeat] = useState("none");
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t.sheetTitle}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          const name = title.trim();
          if (!name) return;
          setBusy(true);
          await onSubmit({
            id: newId(),
            title: name,
            dueAt: due || null,
            dueTime: due && time ? time : null,
            repeatRule: repeat === "none" ? null : repeat,
            assignedTo: assignee || null,
            urgent,
            category: category.trim() || null,
          });
          setBusy(false);
          onClose();
        }}
        className="max-h-[92vh] w-full space-y-3 overflow-y-auto rounded-t-[28px] bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{t.sheetTitle}</h2>
          <button type="button" aria-label={t.close} onClick={onClose} className="flex size-11 items-center justify-center text-2xl text-muted">×</button>
        </div>
        <input ref={first} className={inputCls} aria-label={t.titlePlaceholder} placeholder={t.titlePlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm text-muted">{t.dueLabel}</span>
            <input className={inputCls} type="date" min={todayInput()} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">{t.timeLabel}</span>
            <input className={inputCls} type="time" disabled={!due} value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t.categoryLabel}</span>
          <input className={inputCls} maxLength={80} placeholder={t.categoryPlaceholder} value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm text-muted">{t.repeatLabel}</span>
            <select className={inputCls} value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              {Object.entries(t.repeat).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          {people.length > 1 && (
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.assigneeLabel}</span>
              <select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">{t.everyone}</option>
                {people.map((m) => (
                  <option key={m.id} value={m.id}>{m.id === currentUserId ? t.me : m.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-tile px-4 py-3">
          <span className="font-bold">{t.urgentLabel}</span>
          <Switch checked={urgent} onChange={setUrgent} label={t.urgentLabel} />
        </div>
        <button className={buttonCls} disabled={busy || !title.trim()}>{t.add}</button>
      </form>
    </div>
  );
}
