import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { getSessionUser } from "@/lib/auth/session";

/** Destino del QR: si no hay sesión, vuelve aquí después de iniciar sesión. */
export default async function BoxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await getSessionUser())) redirect(`/login?next=${encodeURIComponent(`/b/${id}`)}`);
  return (
    <>
      <main className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">{children}</main>
      <div className="print:hidden"><BottomNav /></div>
    </>
  );
}
