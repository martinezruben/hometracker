"use client";

import { es } from "@/lib/i18n/es";
import { dayHeading, groupByDay, kindGroup, type KindGroup, type TimelineEvent } from "@/lib/timeline";
import { localParts, useNow } from "@/components/home/useNow";
import { Timeline } from "@/components/ui/Timeline";
import type { Tint } from "@/components/ui/IconTile";

const tint: Record<KindGroup, Tint> = { task: "green", maintenance: "orange", expense: "yellow", box: "teal" };

/** Bitácora agrupada por día (según la zona horaria del dispositivo), con cifras del día y la línea de tiempo. */
export function ActivityFeed({ events, serverNow }: { events: TimelineEvent[]; serverNow: Date }) {
  const now = useNow();
  const ref = now ?? serverNow;
  // Al hidratar se agrupa por día UTC (igual que el servidor); luego, por el día local del dispositivo.
  const dayOf = (d: Date) => (now ? localParts(d).day : d.toISOString().slice(0, 10));
  const today = dayOf(ref);
  const groups = groupByDay(events, dayOf);
  if (groups.length === 0) return <p className="card p-4 text-muted">{es.activity.empty}</p>;

  return (
    <div className="space-y-7">
      {groups.map(({ day, events: list }) => {
        const h = dayHeading(day, today);
        const counts = new Map<KindGroup, number>();
        for (const e of list) counts.set(kindGroup(e.kind), (counts.get(kindGroup(e.kind)) ?? 0) + 1);
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        return (
          <section key={day} aria-label={`${h.label ?? ""} ${h.date}`.trim()} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[24px] font-bold">
                {h.label && <>{h.label} <span className="font-normal text-muted">· </span></>}
                <span className={h.label ? "font-normal text-muted" : ""}>{h.date}</span>
              </h2>
              <span className="shrink-0 text-sm text-muted">{es.activity.records(list.length)}</span>
            </div>
            <ul className="grid grid-cols-3 gap-2.5">
              {top.map(([g, n]) => (
                <li key={g} className="rounded-3xl px-4 py-3.5" style={{ background: `var(--tint-${tint[g]})`, color: `var(--on-tint-${tint[g]})` }}>
                  <p className="text-[26px] font-extrabold leading-none">{n}</p>
                  <p className="mt-1.5 text-[14px] font-semibold">{es.activity.groups[g]}</p>
                </li>
              ))}
            </ul>
            <Timeline upcoming={[]} past={list} now={ref} empty={es.activity.empty} showToday={false} />
          </section>
        );
      })}
    </div>
  );
}
