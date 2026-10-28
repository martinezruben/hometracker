import { es } from "@/lib/i18n/es";
import { daysUntil } from "@/lib/maintenance/schedule";
import { StatusPill, statusOf } from "@/components/ui/Status";

export function DueBadge({ nextDue, now = new Date() }: { nextDue: Date; now?: Date }) {
  const days = daysUntil(nextDue, now);
  const label =
    days < 0 ? es.appliances.due.overdue(-days) : days === 0 ? es.appliances.due.today : es.appliances.due.inDays(days);
  return <StatusPill status={statusOf(nextDue, now)}>{label}</StatusPill>;
}
