import { arcPath } from "@/lib/home/dial";

/** Arcos de un anillo repartido en segmentos (p. ej. al día / vencidos / por vencer), con un pequeño hueco entre ellos. */
export function ringArcs(cx: number, cy: number, r: number, values: number[], gapFraction = 0.03): (string | null)[] {
  const total = values.reduce((n, v) => n + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => null);
  const nonEmpty = values.filter((v) => v > 0).length;
  let acc = 0;
  return values.map((v) => {
    if (v <= 0) return null;
    const f = v / total;
    const start = acc;
    acc += f;
    if (nonEmpty === 1) return arcPath(cx, cy, r, 0, 24);
    const gap = Math.min(gapFraction, f / 3);
    return arcPath(cx, cy, r, (start + gap / 2) * 24, (acc - gap / 2) * 24);
  });
}
