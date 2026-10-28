import { Avatar, initialOf } from "@/components/ui/Avatar";

/** Avatares superpuestos de los miembros del hogar. */
export function AvatarStack({ members, label }: { members: { id: string; name: string | null; email: string }[]; label: string }) {
  const shown = members.slice(0, 3);
  return (
    <ul className="flex shrink-0 items-center -space-x-2.5 pt-1" aria-label={label}>
      {shown.map((m) => (
        <li key={m.id} title={m.name ?? m.email}>
          <Avatar seed={m.id} label={initialOf(m.name, m.email)} size={40} />
        </li>
      ))}
      {members.length > 3 && <li className="flex size-10 items-center justify-center rounded-full bg-card text-xs font-extrabold ring-2 ring-white/70">+{members.length - 3}</li>}
    </ul>
  );
}
