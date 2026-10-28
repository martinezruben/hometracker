import { BottomNav } from "@/components/BottomNav";
import { requireActiveHousehold } from "@/lib/auth/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireActiveHousehold();
  return (
    <>
      <main className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-32">{children}</main>
      <BottomNav />
    </>
  );
}
