import { requireActiveHousehold } from "@/lib/auth/access";
import { getPrefs } from "@/lib/notifications/data";
import { NotificationsPanel } from "@/components/NotificationsPanel";

export default async function RemindersPage() {
  const { user } = await requireActiveHousehold();
  return <NotificationsPanel initial={await getPrefs(user.id)} />;
}
