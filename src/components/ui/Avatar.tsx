const palette = [
  ["#7c3aed", "#4f46e5"],
  ["#f97316", "#ef4444"],
  ["#10b981", "#0d9488"],
  ["#2563eb", "#7c3aed"],
  ["#ec4899", "#f97316"],
];

/** Color estable derivado del id (mismo avatar en todas las pantallas). */
export function avatarColors(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export const initialOf = (name: string | null | undefined, email?: string) =>
  (name?.trim() || email?.trim() || "?").charAt(0).toUpperCase();

/** Círculo con la inicial y un degradado estable. */
export function Avatar({ seed, label, size = 44 }: { seed: string; label: string; size?: number }) {
  const [a, b] = avatarColors(seed);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-2 ring-white/70"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {label}
    </span>
  );
}
