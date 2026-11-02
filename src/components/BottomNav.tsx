"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { BoxIcon, HomeIcon, ListIcon, ScanIcon, WrenchIcon } from "@/components/icons";

type Item = { href: string; label: string; Icon: typeof HomeIcon; match: (p: string) => boolean };

const items: Item[] = [
  { href: "/", label: es.nav.home, Icon: HomeIcon, match: (p) => p === "/" },
  { href: "/boxes", label: es.nav.boxes, Icon: BoxIcon, match: (p) => p.startsWith("/boxes") || p.startsWith("/b/") },
  { href: "/appliances", label: es.nav.appliances, Icon: WrenchIcon, match: (p) => p.startsWith("/appliances") || p.startsWith("/e/") },
  { href: "/lists", label: es.nav.lists, Icon: ListIcon, match: (p) => p.startsWith("/lists") || p.startsWith("/tasks") },
];

function Tab({ item, pathname }: { item: Item; pathname: string }) {
  const active = item.match(pathname);
  return (
    <li className="flex justify-center">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[11px] font-bold ${
          active ? "bg-primary/10 text-link" : "text-muted"
        }`}
      >
        <item.Icon width={22} height={22} />
        {item.label}
      </Link>
    </li>
  );
}

/** Barra inferior flotante: Inicio · Cajas · [Escanear] · Equipos · Listas. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 rounded-full border border-border bg-card px-2 py-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.28)]"
    >
      <ul className="grid grid-cols-5 items-center">
        <Tab item={items[0]} pathname={pathname} />
        <Tab item={items[1]} pathname={pathname} />
        <li className="flex justify-center">
          <Link
            href="/scan"
            aria-label={es.nav.scan}
            aria-current={pathname.startsWith("/scan") ? "page" : undefined}
            className="-my-5 flex size-[68px] items-center justify-center rounded-full bg-brand text-white ring-[6px] ring-[color:var(--bg-bottom)] shadow-[0_10px_26px_rgb(47_109_240/0.45)]"
          >
            <ScanIcon width={30} height={30} />
          </Link>
        </li>
        <Tab item={items[2]} pathname={pathname} />
        <Tab item={items[3]} pathname={pathname} />
      </ul>
    </nav>
  );
}
