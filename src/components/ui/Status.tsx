import { daysUntil, dueStatus, type DueStatus } from "@/lib/maintenance/schedule";

const tone: Record<DueStatus, { text: string; bg: string; bar: string }> = {
  overdue: { text: "text-late", bg: "bg-late-bg", bar: "bg-late-bar" },
  soon: { text: "text-soon", bg: "bg-soon-bg", bar: "bg-soon-bar" },
  ok: { text: "text-ok", bg: "bg-ok-bg", bar: "bg-ok-bar" },
};

export const statusOf = (nextDue: Date, now = new Date()) => dueStatus(nextDue, now);

/** Etiqueta de estado (siempre con texto: nunca solo color). */
export function StatusPill({ status, children }: { status: DueStatus; children: React.ReactNode }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${tone[status].bg} ${tone[status].text}`}>{children}</span>;
}

/** Mini barra de progreso del mismo color que el estado. `progress` entre 0 y 1. */
export function StatusBar({ status, progress }: { status: DueStatus; progress: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-border" role="presentation">
      <span className={`block h-full rounded-full ${tone[status].bar}`} style={{ width: `${Math.round(Math.min(1, Math.max(0.06, progress)) * 100)}%` }} />
    </span>
  );
}

export { daysUntil };
