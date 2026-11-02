"use client";

import { useState } from "react";
import { es } from "@/lib/i18n/es";
import { taskSubtitle } from "@/lib/tasks/format";
import type { DoneTaskView, TaskView } from "@/lib/tasks/groups";
import { StepsPanel } from "@/components/tasks/StepsPanel";
import { Avatar, initialOf } from "@/components/ui/Avatar";

export type Person = { id: string; label: string; email: string; name: string | null };

const avatarFor = (people: Person[], id: string | null) => {
  const p = people.find((x) => x.id === id);
  return p ? <Avatar seed={p.id} label={initialOf(p.name, p.email)} size={36} /> : null;
};

export function OpenTaskRow({
  task,
  people,
  canEdit,
  showWeekday,
  onComplete,
  onDelete,
}: {
  task: TaskView;
  people: Person[];
  canEdit: boolean;
  showWeekday?: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sub = taskSubtitle(task, { showWeekday });
  return (
    <li className="card p-3">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          aria-label={task.title}
          className="size-7 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-muted/50 bg-transparent checked:border-ok-bar checked:bg-ok-bar"
          disabled={!canEdit}
          checked={false}
          onChange={onComplete}
        />
        <button className="min-h-11 min-w-0 flex-1 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="line-clamp-2 break-words text-[16px] font-extrabold leading-snug">{task.title}</span>
          {(sub.length > 0 || task.pending) && (
            <span className="block truncate text-[13px] text-muted">{[...sub, task.pending ? es.sync.pendingTag : null].filter(Boolean).join(" · ")}</span>
          )}
        </button>
        {task.urgent && <span className="shrink-0 rounded-full bg-late-bg px-2.5 py-1 text-xs font-extrabold text-late">{es.tasks.urgent}</span>}
        {avatarFor(people, task.assignedTo)}
      </div>
      {open && (
        <div>
          {!task.pending && <StepsPanel taskId={task.id} canEdit={canEdit} />}
          {canEdit && (
            <button className="mt-2 min-h-11 text-sm font-bold text-danger" onClick={onDelete}>
              {es.tasks.delete}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function DoneTaskRow({ task, people, canEdit, onReopen }: { task: DoneTaskView; people: Person[]; canEdit: boolean; onReopen: () => void }) {
  const who = people.find((p) => p.id === (task.doneBy ?? task.assignedTo));
  return (
    <li className="card flex items-center gap-3 p-3">
      <button
        aria-label={`${es.tasks.reopen} ${task.title}`}
        disabled={!canEdit}
        onClick={onReopen}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ok-bar text-white"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-extrabold text-muted line-through">{task.title}</p>
        <p className="truncate text-[13px] text-muted">{who ? es.tasks.doneBy(who.id ? who.label : "") : es.tasks.doneByUnknown}</p>
      </div>
      {who && <Avatar seed={who.id} label={initialOf(who.name, who.email)} size={36} />}
    </li>
  );
}
