import { es } from "@/lib/i18n/es";

/** Esqueleto que se ve al instante mientras la página carga datos (navegación más ágil). */
export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label={es.loading}>
      <div className="h-8 w-40 animate-pulse rounded-xl bg-tile" />
      <div className="card h-40 animate-pulse" />
      <div className="card h-20 animate-pulse" />
      <div className="card h-20 animate-pulse" />
    </div>
  );
}
