/** Anillo de progreso con texto central ("3/8"). `value` entre 0 y 1. */
export function Ring({ value, label, size = 64 }: { value: number; label: string; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="url(#ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, Math.max(0, value))} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold">{label}</span>
    </div>
  );
}
