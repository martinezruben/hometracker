import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { uuid } from "@/lib/appliances/schemas";

/** Destino del QR de un equipo: pide login si hace falta y vuelve aquí. */
export default async function ApplianceQrPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  if (!(await getSessionUser())) redirect(`/login?next=${encodeURIComponent(`/e/${parsed.data}`)}`);
  redirect(`/appliances/${parsed.data}`);
}
