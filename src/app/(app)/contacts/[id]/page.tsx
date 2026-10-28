import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/access";
import { getContactAccess } from "@/lib/contacts/data";
import { cleanPhone, uuid } from "@/lib/contacts/schemas";
import { es } from "@/lib/i18n/es";
import { ContactActions } from "@/components/ContactActions";
import { linkBtnCls } from "@/components/ui";

const t = es.contacts;
const actionCls = "flex min-h-12 flex-1 items-center justify-center rounded-xl border border-primary font-semibold text-primary";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await requireUser();
  const access = await getContactAccess(user.id, parsed.data);
  if (!access) return <p className="rounded-xl border border-border bg-card p-4 text-muted">{t.noAccess}</p>;
  const { contact: c, role } = access;
  const phone = c.phone ? cleanPhone(c.phone) : null;
  return (
    <section className="space-y-4">
      <Link href="/contacts" className={linkBtnCls}>← {t.back}</Link>
      <header>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-muted">{[c.category, c.rating ? "★".repeat(c.rating) : null].filter(Boolean).join(" · ")}</p>
      </header>
      <div className="flex gap-3">
        {phone && <a className={actionCls} href={`tel:${phone}`}>{t.call}</a>}
        {phone && (
          <a className={actionCls} href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer">
            {t.whatsapp}
          </a>
        )}
        {c.email && <a className={actionCls} href={`mailto:${c.email}`}>{t.mail}</a>}
      </div>
      {c.phone && <p className="text-sm text-muted">{c.phone}</p>}
      {c.email && <p className="text-sm text-muted">{c.email}</p>}
      {c.notes && <p className="whitespace-pre-line text-sm">{c.notes}</p>}
      {role !== "viewer" && (
        <ContactActions
          id={c.id}
          initial={{ name: c.name, category: c.category ?? "", phone: c.phone ?? "", email: c.email ?? "", rating: c.rating ? String(c.rating) : "", notes: c.notes ?? "" }}
        />
      )}
    </section>
  );
}
