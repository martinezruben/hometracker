import type { ReactNode } from "react";
import { IconTile, type Tint } from "@/components/ui/IconTile";

/** Estado vacío con icono de color y texto centrado (en vez de una línea suelta). */
export function EmptyState({ icon, tint = "blue", children }: { icon: ReactNode; tint?: Tint; children: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-9 text-center">
      <IconTile tint={tint} size={64}>{icon}</IconTile>
      <p className="max-w-[28ch] text-[16px] leading-snug text-muted">{children}</p>
    </div>
  );
}
