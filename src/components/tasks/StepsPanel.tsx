"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { newId } from "@/lib/uuid";
import { inputCls } from "@/components/ui";

type Step = { id: string; title: string; done: boolean };

/** Pasos de un pendiente (necesitan conexión; se cargan al abrir la fila). */
export function StepsPanel({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tasks/${taskId}/steps`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setSteps(d.steps))
      .catch(() => alive && setError(es.tasks.stepsOffline));
    return () => {
      alive = false;
    };
  }, [taskId]);

  async function send(url: string, method: string, body?: unknown) {
    setError(null);
    try {
      const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      setError(es.tasks.stepsOffline);
      return false;
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-tile p-3">
      <h3 className="text-sm font-extrabold">{es.tasks.stepsTitle}</h3>
      {steps?.map((s) => (
        <div key={s.id} className="flex items-center gap-3">
          <input
            type="checkbox"
            aria-label={s.title}
            className="size-6 shrink-0 accent-[var(--primary)]"
            checked={s.done}
            disabled={!canEdit}
            onChange={async () => {
              setSteps((cur) => cur!.map((x) => (x.id === s.id ? { ...x, done: !s.done } : x)));
              if (await send(`/api/task-steps/${s.id}`, "PATCH", { done: !s.done })) router.refresh();
            }}
          />
          <span className={`min-w-0 flex-1 ${s.done ? "text-muted line-through" : ""}`}>{s.title}</span>
          {canEdit && (
            <button
              aria-label={`${es.tasks.delete} ${s.title}`}
              className="min-h-11 min-w-11 text-muted"
              onClick={async () => {
                setSteps((cur) => cur!.filter((x) => x.id !== s.id));
                if (await send(`/api/task-steps/${s.id}`, "DELETE")) router.refresh();
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {canEdit && steps && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = title.trim();
            if (!t) return;
            const id = newId();
            if (await send(`/api/tasks/${taskId}/steps`, "POST", { id, title: t })) {
              setSteps((cur) => [...(cur ?? []), { id, title: t, done: false }]);
              setTitle("");
              router.refresh();
            }
          }}
        >
          <input className={inputCls} aria-label={es.tasks.stepPlaceholder} placeholder={es.tasks.stepPlaceholder} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="min-h-12 shrink-0 rounded-2xl bg-brand px-4 font-bold text-white" aria-label={es.tasks.stepAdd}>+</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
