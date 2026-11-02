import { ringArcs } from "@/lib/ring";

const tone = { ok: "stroke-ok-bar", soon: "stroke-soon-bar", late: "stroke-late-bar" } as const;

/** Anillo de estado: al día / por vencer / vencidos en un círculo, con el número principal al centro. */
export function StatusRing({
  ok,
  soon,
  late,
  center,
  caption,
  label,
  size = 116,
}: {
  ok: number;
  soon: number;
  late: number;
  center: string;
  caption: string;
  label: string;
  size?: number;
}) {
  const [okArc, lateArc, soonArc] = ringArcs(60, 60, 44, [ok, late, soon]);
  return (
    <svg role="img" aria-label={label} viewBox="0 0 120 120" width={size} height={size} className="shrink-0">
      <circle cx="60" cy="60" r="44" fill="none" strokeWidth="13" className="stroke-border" />
      {okArc && <path d={okArc} fill="none" strokeWidth="13" strokeLinecap="round" className={tone.ok} />}
      {lateArc && <path d={lateArc} fill="none" strokeWidth="13" strokeLinecap="round" className={tone.late} />}
      {soonArc && <path d={soonArc} fill="none" strokeWidth="13" strokeLinecap="round" className={tone.soon} />}
      <text x="60" y="64" textAnchor="middle" fontSize="34" fontWeight="800" className="fill-foreground">{center}</text>
      <text x="60" y="82" textAnchor="middle" fontSize="12" className="fill-muted">{caption}</text>
    </svg>
  );
}
