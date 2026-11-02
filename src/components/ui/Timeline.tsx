import Link from "next/link";
import type { ReactNode } from "react";
import { es } from "@/lib/i18n/es";
import { relativeTime, type TimelineEvent, type TimelineKind, type TimelineTone } from "@/lib/timeline";
import { formatDate } from "@/lib/format";
import { BagIcon, BoxIcon, CalendarIcon, CameraIcon, CheckCircleIcon, ClockIcon, ListIcon, PlusIcon, ReceiptIcon, ShieldIcon, WrenchIcon } from "@/components/icons";

const icon: Record<TimelineKind, (p: { width: number; height: number }) => ReactNode> = {
  purchase: (p) => <BagIcon {...p} />,
  warranty: (p) => <ShieldIcon {...p} />,
  done: (p) => <CheckCircleIcon {...p} />,
  due: (p) => <WrenchIcon {...p} />,
  task: (p) => <ListIcon {...p} />,
  expense: (p) => <ReceiptIcon {...p} />,
  created: (p) => <PlusIcon {...p} />,
  item: (p) => <BoxIcon {...p} />,
  photo: (p) => <CameraIcon {...p} />,
};

const tone: Record<TimelineTone, string> = {
  ok: "bg-ok-bg text-ok",
  soon: "bg-soon-bg text-soon",
  overdue: "bg-late-bg text-late",
  info: "bg-tile text-link",
};

function Row({ e, now, last }: { e: TimelineEvent; now: Date; last: boolean }) {
  const body = (
    <div className="min-w-0 flex-1 pb-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 break-words text-[15px] font-extrabold leading-snug">{e.title}</p>
        <time dateTime={e.at.toISOString()} className="shrink-0 text-[12px] font-bold text-muted">{relativeTime(e.at, now)}</time>
      </div>
      <p className="flex items-center gap-1 text-[13px] text-muted">
        <CalendarIcon width={13} height={13} /> {formatDate(e.at)}
      </p>
      {e.detail && <p className="mt-0.5 break-words text-[13px] text-muted">{e.detail}</p>}
    </div>
  );
  return (
    <li className="flex gap-3">
      <div className="flex w-9 shrink-0 flex-col items-center">
        <span aria-hidden className={`flex size-9 items-center justify-center rounded-full ${tone[e.tone]}`}>{icon[e.kind]({ width: 18, height: 18 })}</span>
        {!last && <span aria-hidden className="mt-1 w-0.5 flex-1 rounded-full bg-border" />}
      </div>
      {e.href ? <Link href={e.href} className="min-w-0 flex-1">{body}</Link> : body}
    </li>
  );
}

/**
 * Línea de tiempo vertical: lo que viene arriba (más cercano primero), un marcador "Hoy" y lo ya ocurrido debajo.
 * Con `showToday` solo se muestra el marcador si hay eventos de ambos lados.
 */
export function Timeline({ upcoming, past, now, empty, showToday = true }: { upcoming: TimelineEvent[]; past: TimelineEvent[]; now: Date; empty: string; showToday?: boolean }) {
  if (upcoming.length === 0 && past.length === 0) return <p className="card p-4 text-muted">{empty}</p>;
  const upcomingDesc = [...upcoming].reverse(); // el más lejano arriba, el más cercano junto a "Hoy"
  return (
    <ol className="card p-4" aria-label={es.timeline.title}>
      {upcomingDesc.map((e, i) => (
        <Row key={e.id} e={e} now={now} last={past.length === 0 && i === upcomingDesc.length - 1} />
      ))}
      {showToday && upcoming.length > 0 && past.length > 0 && (
        <li className="mb-3 flex items-center gap-3" aria-label={es.timeline.today}>
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"><ClockIcon width={18} height={18} /></span>
          <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-extrabold text-white">{es.timeline.today}</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </li>
      )}
      {past.map((e, i) => (
        <Row key={e.id} e={e} now={now} last={i === past.length - 1} />
      ))}
    </ol>
  );
}
