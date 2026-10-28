import { redirect } from "next/navigation";
import { JoinButton } from "@/components/JoinButton";
import { getSessionUser } from "@/lib/auth/session";
import { es } from "@/lib/i18n/es";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await getSessionUser())) redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  return (
    <>
      <h1 className="text-2xl font-bold">{es.invite.joinTitle}</h1>
      <JoinButton token={token} />
    </>
  );
}
