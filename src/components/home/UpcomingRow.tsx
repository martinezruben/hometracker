import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { formatDate } from "@/lib/format";
import type { UpcomingItem } from "@/lib/home/upcoming";
import { CalendarIcon, ListIcon, ShieldIcon, WrenchIcon } from "@/components/icons";
import { IconTile, type Tint } from "@/components/ui/IconTile";
import { StatusBar } from "@/components/ui/Status";

const text = { overdue: "text-late", soon: "text-soon", ok: "text-ok" } as const;

function label(i: UpcomingItem) {
  if (i.status === "overdue") return es.upcoming.overdue;
  if (i.status === "ok") return es.upcoming.ok;
  return i.days === 0 ? es.upcoming.today : es.upcoming.inDays(i.days);
}

/** Fila de "Próximos": icono por tipo, título, fecha · contexto y estado con barra. */
export function UpcomingRow({ item }: { item: UpcomingItem }) {
  const tint: Tint = item.status === "overdue" ? "red" : item.kind === "document" ? "purple" : item.kind === "task" ? "green" : "blue";
  const Icon = item.kind === "document" ? ShieldIcon : item.kind === "task" ? ListIcon : WrenchIcon;
  const when = item.days < 0 ? es.upcoming.ago(-item.days) : formatDate(item.date);
  const context = item.kind === "document" ? es.upcoming.documents : item.context;
  const progress = item.status === "overdue" ? 1 : item.status === "soon" ? 0.75 : Math.max(0.1, 1 - item.days / 60);
  return (
    <li>
      <Link href={item.href} className="card flex min-h-[72px] items-center gap-3 p-3">
        <IconTile tint={tint}><Icon width={22} height={22} /></IconTile>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold">{item.title}</p>
          <p className="flex items-center gap-1.5 truncate text-[13px] text-muted">
            <CalendarIcon width={14} height={14} />
            <span className="truncate">{[when, context].filter(Boolean).join(" · ")}</span>
          </p>
        </div>
        <div className="w-[84px] shrink-0 space-y-1.5 text-right">
          <p className={`text-[13px] font-extrabold ${text[item.status]}`}>{label(item)}</p>
          <StatusBar status={item.status} progress={progress} />
        </div>
      </Link>
    </li>
  );
}
