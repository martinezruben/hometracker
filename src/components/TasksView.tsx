"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { todayInput } from "@/lib/format";
import { mutate } from "@/lib/offline/outbox";
import { overlayTasks, type TaskView } from "@/lib/offline/overlay";
import { useOutbox } from "@/lib/offline/useOutbox";
import { parseDateOnly } from "@/lib/maintenance/schedule";
import { newId } from "@/lib/uuid";
import { DueBadge } from "@/components/DueBadge";
import { buttonCls, inputCls, linkBtnCls } from "@/components/ui";

const t = es.tasks;

export function TasksView({
  open,
  done,
  members,
  currentUserId,
  canEdit,
}: {
  open: TaskView[];
  done: { id: string; title: string }[];
  members: { id: string; label: string }[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const outbox = useOutbox();
  const view = overlayTasks(open, outbox);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = (id: string | null) => (id === currentUserId ? t.me : members.find((m) => m.id === id)?.label);

  async function run(req: Parameters<typeof mutate>[0]) {
    setError(null);
    try {
      const { queued } = await mutate(req);
      if (!queued && navigator.onLine) router.refresh();
      return true;
    } catch {
      setError(es.auth.genericError);
      return false;
    }
  }

  return (
    <div className="space-y-4">
      {view.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {view.map((task) => (
            <li key={task.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                aria-label={task.title}
                className="size-6 shrink-0 accent-[var(--primary)]"
                disabled={!canEdit}
                checked={false}
                onChange={() =>
                  void run({
                    url: `/api/tasks/${task.id}/complete`,
                    method: "POST",
                    body: { dueAt: task.dueAt },
                    meta: { op: "task-complete", taskId: task.id },
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">{task.title}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  {task.repeatRule && <span>🔁</span>}
                  {task.assignedTo && <span>{label(task.assignedTo)}</span>}
                  {task.pending && <span>{es.sync.pendingTag}</span>}
                </p>
              </div>
              {task.dueAt && <DueBadge nextDue={parseDateOnly(task.dueAt)} />}
              {canEdit && (
                <button
                  aria-label={t.delete}
                  className="min-h-11 min-w-11 text-muted"
                  onClick={() => void run({ url: `/api/tasks/${task.id}`, method: "DELETE", meta: { op: "task-delete", taskId: task.id } })}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const name = title.trim();
            if (!name) return;
            const id = newId();
            const repeatRule = repeat === "none" ? null : repeat;
            const body = { id, title: name, dueAt: due || null, repeatRule, assignedTo: assignee || null };
            void run({
              url: "/api/tasks",
              method: "POST",
              body,
              meta: { op: "task-add", taskId: id, data: { title: name, dueAt: body.dueAt, repeatRule, assignedTo: body.assignedTo } },
            }).then((ok) => {
              if (ok) {
                setTitle("");
                setDue("");
                setRepeat("none");
                setAssignee("");
              }
            });
          }}
        >
          <input className={inputCls} placeholder={t.titlePlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.dueLabel}</span>
              <input className={inputCls} type="date" min={todayInput()} value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.repeatLabel}</span>
              <select className={inputCls} value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                {Object.entries(t.repeat).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          {members.length > 1 && (
            <label className="block space-y-1">
              <span className="text-sm text-muted">{t.assigneeLabel}</span>
              <select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">{t.everyone}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.id === currentUserId ? t.me : m.label}</option>
                ))}
              </select>
            </label>
          )}
          <button className={buttonCls} disabled={!title.trim()}>{t.add}</button>
        </form>
      )}

      {done.length > 0 && (
        <details className="rounded-xl border border-border bg-card p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">{t.done}</summary>
          <ul className="divide-y divide-border">
            {done.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-muted line-through">{d.title}</span>
                {canEdit && (
                  <button
                    className={linkBtnCls}
                    onClick={() => void run({ url: `/api/tasks/${d.id}`, method: "PATCH", body: { reopen: true }, meta: { op: "task-update", taskId: d.id } })}
                  >
                    {t.reopen}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
