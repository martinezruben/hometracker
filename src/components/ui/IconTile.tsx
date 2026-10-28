import type { ReactNode } from "react";

export type Tint = "blue" | "orange" | "green" | "purple" | "red" | "yellow";

/** Cuadro de color pastel con un icono (44 px por defecto). */
export function IconTile({ tint = "blue", children, size = 44 }: { tint?: Tint; children: ReactNode; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[14px]"
      style={{ width: size, height: size, background: `var(--tint-${tint})`, color: `var(--on-tint-${tint})` }}
    >
      {children}
    </span>
  );
}
