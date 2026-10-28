import Link from "next/link";

/** Control segmentado en píldora blanca; la pestaña activa va en azul. */
export function Segmented({ items, active, label }: { items: { key: string; label: string; href: string }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="card flex gap-1 rounded-full p-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === active ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-[15px] font-extrabold ${it.key === active ? "bg-brand text-white shadow-[0_4px_12px_rgb(29_78_216/0.35)]" : "text-foreground"}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
