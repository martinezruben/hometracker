import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/icons";
import { es } from "@/lib/i18n/es";

/** Pantalla de formulario: botón de volver, título grande y los campos dentro de una tarjeta. */
export function FormShell({ title, backHref, children }: { title: string; backHref: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <Link href={backHref} aria-label={es.boxes.back} className="card flex size-11 items-center justify-center rounded-full">
          <ChevronLeftIcon width={22} height={22} />
        </Link>
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">{title}</h1>
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}
