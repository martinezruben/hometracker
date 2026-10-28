import { es } from "@/lib/i18n/es";
import { daysUntil, dueStatus } from "@/lib/maintenance/schedule";

const styles = {
  overdue: "bg-red-100 text-red-800",
  soon: "bg-amber-100 text-amber-900",
  ok: "bg-emerald-100 text-emerald-800",
} as const;

export function DueBadge({ nextDue, now = new Date() }: { nextDue: Date; now?: Date }) {
  const days = daysUntil(nextDue, now);
  const label =
    days < 0 ? es.appliances.due.overdue(-days) : days === 0 ? es.appliances.due.today : es.appliances.due.inDays(days);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[dueStatus(nextDue, now)]}`}>{label}</span>;
}
