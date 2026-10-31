type P3 = [number, number, number];

/** Proyección isométrica: x e y sobre el suelo, z hacia arriba. */
const COS = Math.cos(Math.PI / 6);
const S = 18;
const OX = 120;
const OY = 104;
const pt = ([x, y, z]: P3) => [OX + (x - y) * COS * S, OY + (x + y) * 0.5 * S - z * S] as const;
const d = (pts: P3[], close = false) =>
  pts.map((p, i) => `${i ? "L" : "M"}${pt(p)[0].toFixed(1)} ${pt(p)[1].toFixed(1)}`).join("") + (close ? "Z" : "");

// Casa de 4×4 centrada en el origen, muros de 2.4 y techo a dos aguas con cumbrera a lo largo de x.
const H = 2.4;
const R = 4.1;
const a: P3[] = [[-2, -2, 0], [2, -2, 0], [2, 2, 0], [-2, 2, 0]];
const top: P3[] = a.map(([x, y]) => [x, y, H]);
const ridge: P3[] = [[-2.3, 0, R], [2.3, 0, R]];

/** Casa isométrica en alambre (wireframe) con cuadrícula de suelo; decorativa. */
export function HouseIllustration({ className }: { className?: string }) {
  const grid: string[] = [];
  for (let i = -4; i <= 4; i += 2) {
    grid.push(d([[i, -4, 0], [i, 4, 0]]), d([[-4, i, 0], [4, i, 0]]));
  }
  const dots = [...a, ...top, ...ridge];
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden fill="none" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <radialGradient id="hw-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ stopColor: "var(--link)", stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: "var(--link)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="104" rx="112" ry="52" fill="url(#hw-glow)" />
      {/* suelo */}
      <path d={d([[-4, -4, 0], [4, -4, 0], [4, 4, 0], [-4, 4, 0]], true)} strokeWidth="1.2" style={{ stroke: "var(--link)", strokeOpacity: 0.55 }} />
      <path d={grid.join("")} strokeWidth="0.8" style={{ stroke: "var(--link)", strokeOpacity: 0.28 }} />
      {/* aristas traseras */}
      <path d={d([a[0], top[0]]) + d([a[0], a[1]]) + d([a[0], a[3]])} strokeWidth="1" strokeDasharray="3 3" style={{ stroke: "var(--link)", strokeOpacity: 0.4 }} />
      {/* caras con vidrio */}
      <path d={d([a[1], a[2], top[2], top[1]], true)} style={{ fill: "var(--primary-2)", fillOpacity: 0.1 }} />
      <path d={d([a[2], a[3], top[3], top[2]], true)} style={{ fill: "var(--primary-2)", fillOpacity: 0.2 }} />
      <path d={d([top[2], top[3], [-2.3, 0, R], [2.3, 0, R]], true)} style={{ fill: "var(--primary-2)", fillOpacity: 0.3 }} />
      <g strokeWidth="1.6" style={{ stroke: "var(--link)", filter: "drop-shadow(0 0 3px var(--link))" }}>
        {/* muros */}
        <path d={d([a[1], a[2], top[2], top[1]], true)} />
        <path d={d([a[2], a[3], top[3], top[2]], true)} />
        {/* techo */}
        <path d={d([top[1], [2.3, 0, R], [-2.3, 0, R], top[0]])} />
        <path d={d([top[2], [2.3, 0, R]]) + d([top[3], [-2.3, 0, R]]) + d([top[3], top[0]])} />
        <path d={d([[-2.3, 0, R], [2.3, 0, R]])} />
        {/* chimenea */}
        <path d={d([[1, -0.9, 3.1], [1, -0.9, 4.5], [1.6, -0.9, 4.5], [1.6, -0.9, 3.4]]) + d([[1.6, -0.9, 4.5], [1.6, -0.3, 4.5], [1, -0.3, 4.5], [1, -0.9, 4.5]])} />
      </g>
      {/* puerta y ventanas */}
      <g strokeWidth="1.4" style={{ stroke: "var(--ok-bar)", filter: "drop-shadow(0 0 3px var(--ok-bar))" }}>
        <path d={d([[2, 0.2, 0], [2, 0.2, 1.7], [2, 1.2, 1.7], [2, 1.2, 0]])} />
        <path d={d([[2, -1.4, 0.9], [2, -1.4, 1.8], [2, -0.4, 1.8], [2, -0.4, 0.9]], true)} />
        <path d={d([[0.2, 2, 0.9], [0.2, 2, 1.8], [1.4, 2, 1.8], [1.4, 2, 0.9]], true)} />
        <path d={d([[-1.6, 2, 0.9], [-1.6, 2, 1.8], [-0.4, 2, 1.8], [-0.4, 2, 0.9]], true)} />
      </g>
      {/* vértices */}
      {dots.map((p, i) => (
        <circle key={i} cx={pt(p)[0]} cy={pt(p)[1]} r="2" style={{ fill: "var(--card)", stroke: "var(--link)" }} strokeWidth="1.4" />
      ))}
    </svg>
  );
}
