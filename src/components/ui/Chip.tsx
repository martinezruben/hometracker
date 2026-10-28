import Link from "next/link";
import type { ReactNode } from "react";

const cls = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold ${
    active ? "bg-dark text-card" : "card text-foreground"
  }`;

/** Chip de filtro: la selección va en oscuro. */
export function Chip({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={cls(!!active)} aria-current={active ? "true" : undefined}>
      {children}
    </Link>
  );
}
