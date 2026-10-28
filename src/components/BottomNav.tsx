"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { es } from "@/lib/i18n/es";

const items = [
  { href: "/", label: es.nav.home, icon: "🏠" },
  { href: "/boxes", label: es.nav.boxes, icon: "📦" },
  { href: "/appliances", label: es.nav.appliances, icon: "🔧" },
  { href: "/lists", label: es.nav.lists, icon: "📝" },
  { href: "/more", label: es.nav.more, icon: "☰" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-primary font-semibold" : "text-muted"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
