import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { formatMoney } from "@/lib/format";
import type { HomeStats } from "@/lib/home/stats";
import { BoxIcon, ListIcon, WalletIcon, WrenchIcon } from "@/components/icons";
import { IconTile, type Tint } from "@/components/ui/IconTile";

/** Resumen del hogar en cuatro cifras, cada una lleva a su módulo. */
export function StatTiles({ stats }: { stats: HomeStats }) {
  const tiles: { href: string; label: string; value: string; hint: string; tint: Tint; Icon: typeof BoxIcon }[] = [
    { href: "/boxes", label: es.health.statBoxes, value: String(stats.boxes), hint: es.health.statObjects(stats.objects), tint: "yellow", Icon: BoxIcon },
    { href: "/appliances", label: es.health.statAppliances, value: String(stats.appliances), hint: es.health.statAppliancesHint, tint: "blue", Icon: WrenchIcon },
    { href: "/lists", label: es.health.statTasks, value: String(stats.openTasks), hint: es.health.statTasksHint, tint: "green", Icon: ListIcon },
    { href: "/expenses", label: es.health.statExpenses, value: formatMoney(stats.monthExpenses), hint: es.health.statExpensesHint, tint: "orange", Icon: WalletIcon },
  ];
  return (
    <section className="space-y-3" aria-label={es.health.summaryTitle}>
      <h2 className="text-xl font-extrabold">{es.health.summaryTitle}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {tiles.map(({ href, label, value, hint, tint, Icon }) => (
          <li key={href}>
            <Link href={href} className="card flex min-h-[104px] flex-col justify-between gap-2 p-3.5">
              <span className="flex items-center gap-2">
                <IconTile tint={tint} size={32}><Icon width={18} height={18} /></IconTile>
                <span className="truncate text-[13px] font-bold text-muted">{label}</span>
              </span>
              <span>
                <span className="block truncate text-2xl font-extrabold leading-none">{value}</span>
                <span className="mt-1 block truncate text-[12px] text-muted">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
