import { es } from "@/lib/i18n/es";

export default function MorePage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">{es.more.title}</h1>
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        {es.more.items.map((item) => (
          <li key={item} className="flex items-center justify-between p-4">
            <span>{item}</span>
            <span className="text-xs text-muted">{es.more.comingSoon}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
