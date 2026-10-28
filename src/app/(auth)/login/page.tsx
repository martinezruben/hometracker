import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/safe-next";
import { es } from "@/lib/i18n/es";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return (
    <>
      <h1 className="text-2xl font-bold">{es.auth.loginTitle}</h1>
      <LoginForm next={next} />
    </>
  );
}
