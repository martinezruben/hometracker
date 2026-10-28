"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { todayInput } from "@/lib/format";
import { mutate } from "@/lib/offline/outbox";
import { overlayTasks } from "@/lib/offline/overlay";
import { useOutbox } from "@/lib/offline/useOutbox";
import { groupTasks, type DoneTaskView, type TaskView } from "@/lib/tasks/groups";
import { FilterIcon, PlusIcon } from "@/components/icons";
import { NewTaskSheet, type NewTask } from "@/components/tasks/NewTaskSheet";
import { DoneTaskRow, OpenTaskRow, type Person } from "@/components/tasks/TaskRow";
import { Ring } from "@/components/ui/Ring";

const t = es.tasks;
const noop = () => () => undefined;

/** Fecha local del dispositivo (en el servidor se usa la de la petición para no desajustar la hidratación). */
function useToday(serverToday: string) {
  return useSyncExternalStore(noop, () => todayInput(), () => serverToday);
}

export function TasksBoard({
  open,
  done,
  people,
  currentUserId,
  canEdit,
  serverToday,
}: {
  open: TaskView[];
  done: DoneTaskView[];
  people: Person[];
  currentUserId: string;
  canEdit: boolean;
  serverToday: string;
}) {
  const router = useRouter();
  const outbox = useOutbox();
  const today = useToday(serverToday);
  const [mineOnly, setMineOnly] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = overlayTasks(open, outbox).filter((x) => !mineOnly || x.assignedTo === currentUserId || x.assignedTo === null);
  const g = groupTasks(visible, done, today);

  async function run(req: Parameters<typeof mutate>[0]) {
    setError(null);
    try {
      const { queued } = await mutate(req);
      if (!queued && navigator.onLine) router.refresh();
    } catch {
      setError(es.auth.genericError);
    }
  }

  const complete = (x: TaskView) =>
    void run({ url: `/api/tasks/${x.id}/complete`, method: "POST", body: { dueAt: x.dueAt }, meta: { op: "task-complete", taskId: x.id } });
  const remove = (x: TaskView) => void run({ url: `/api/tasks/${x.id}`, method: "DELETE", meta: { op: "task-delete", taskId: x.id } });
  const create = (n: NewTask) =>
    run({
      url: "/api/tasks",
      method: "POST",
      body: n,
      meta: { op: "task-add", taskId: n.id, data: { title: n.title, dueAt: n.dueAt, dueTime: n.dueTime, repeatRule: n.repeatRule, assignedTo: n.assignedTo, urgent: n.urgent, category: n.category } },
    });

  const section = (key: keyof typeof t.groups, rows: TaskView[], extra?: React.ReactNode, weekday?: boolean) =>
    rows.length === 0 && !extra ? null : (
      <section aria-label={t.groups[key]} className="space-y-3">
        <h2 className="pt-1 text-xs font-extrabold tracking-wider text-muted">{t.groups[key]}</h2>
        <ul className="space-y-3">
          {rows.map((x) => (
            <OpenTaskRow key={x.id} task={x} people={people} canEdit={canEdit} showWeekday={weekday} onComplete={() => complete(x)} onDelete={() => remove(x)} />
          ))}
          {extra}
        </ul>
      </section>
    );

  const empty = visible.length === 0 && g.doneToday.length === 0;
  const { doneWeek, totalWeek, pendingWeek, todayCount } = g.summary;

  return (
    <div className="space-y-4">
      <section className="card flex items-center gap-4 p-4" aria-label={t.summaryTitle}>
        <Ring value={totalWeek ? doneWeek / totalWeek : 1} label={`${doneWeek}/${totalWeek}`} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">{t.summaryTitle}</h2>
          <p className="text-sm text-muted">{t.summaryText(pendingWeek, todayCount)}</p>
        </div>
        <button
          aria-label={mineOnly ? t.allTasks : t.onlyMine}
          aria-pressed={mineOnly}
          onClick={() => setMineOnly(!mineOnly)}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${mineOnly ? "border-transparent bg-dark text-card" : "border-border"}`}
        >
          <FilterIcon width={20} height={20} />
        </button>
      </section>

      {empty && <p className="card p-4 text-muted">{t.empty}</p>}

      {section(
        "today",
        g.today,
        g.doneToday.length > 0 ? g.doneToday.map((d) => (
          <DoneTaskRow key={d.id} task={d} people={people} canEdit={canEdit} onReopen={() => void run({ url: `/api/tasks/${d.id}`, method: "PATCH", body: { reopen: true }, meta: { op: "task-update", taskId: d.id } })} />
        )) : undefined,
      )}
      {section("week", g.week, undefined, true)}
      {section("later", g.later, undefined, true)}
      {section("undated", g.undated)}

      {g.olderDone.length > 0 && (
        <details className="card p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-extrabold">{t.done}</summary>
          <ul className="space-y-2">
            {g.olderDone.map((d) => (
              <DoneTaskRow key={d.id} task={d} people={people} canEdit={canEdit} onReopen={() => void run({ url: `/api/tasks/${d.id}`, method: "PATCH", body: { reopen: true }, meta: { op: "task-update", taskId: d.id } })} />
            ))}
          </ul>
        </details>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {canEdit && (
        <button
          onClick={() => setSheet(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] right-4 z-10 flex min-h-14 items-center gap-2 rounded-full bg-dark px-5 font-extrabold text-card shadow-[0_8px_24px_rgb(15_27_61/0.35)]"
        >
          <PlusIcon width={20} height={20} /> {t.newButton}
        </button>
      )}
      {sheet && <NewTaskSheet people={people} currentUserId={currentUserId} onSubmit={create} onClose={() => setSheet(false)} />}
    </div>
  );
}
