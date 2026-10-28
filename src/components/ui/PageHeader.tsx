import type { ReactNode } from "react";

/** Cabecera de pantalla: título grande, subtítulo con conteos y una acción a la derecha. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[32px] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
