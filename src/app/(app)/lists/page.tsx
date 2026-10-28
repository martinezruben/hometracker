import Link from "next/link";
import { requireActiveHousehold } from "@/lib/auth/access";
import { listLists } from "@/lib/lists/data";
import { listMembers, listTasks } from "@/lib/tasks/data";
import type { DoneTaskView, TaskView } from "@/lib/tasks/groups";
import { formatDateOnly } from "@/lib/maintenance/schedule";
import { es } from "@/lib/i18n/es";
import { ChevronRightIcon, ListIcon, WalletIcon } from "@/components/icons";
import { NewListForm } from "@/components/NewListForm";
import { PendingCreates } from "@/components/PendingCreates";
import { TasksBoard } from "@/components/tasks/TasksBoard";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { IconTile } from "@/components/ui/IconTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";

const t = es.listsPage;
type Tab = "pendientes" | "super" | "venta";

export default async function ListsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab: Tab = raw === "super" || raw === "venta" ? raw : "pendientes";
  const { user, household } = await requireActiveHousehold();
  const canEdit = household.role !== "viewer";
  const members = await listMembers(household.id);

  const tabs = (["pendientes", "super", "venta"] as const).map((k) => ({ key: k, label: t.tabs[k], href: k === "pendientes" ? "/lists" : `/lists?tab=${k}` }));

  let body: React.ReactNode;
  if (tab === "pendientes") {
    const { open, done } = await listTasks(household.id);
    const openViews: TaskView[] = open.map((x) => ({
      id: x.id,
      title: x.title,
      notes: x.notes,
      dueAt: x.dueAt ? formatDateOnly(x.dueAt) : null,
      dueTime: x.dueTime,
      repeatRule: x.repeatRule,
      assignedTo: x.assignedTo,
      urgent: x.urgent,
      category: x.category,
      stepsTotal: x.stepsTotal,
      stepsDone: x.stepsDone,
    }));
    const doneViews: DoneTaskView[] = done.map((x) => ({ id: x.id, title: x.title, doneAt: (x.doneAt ?? new Date()).toISOString(), doneBy: x.doneBy, assignedTo: x.assignedTo }));
    body = (
      <TasksBoard
        open={openViews}
        done={doneViews}
        canEdit={canEdit}
        currentUserId={user.id}
        serverToday={new Date().toISOString().slice(0, 10)}
        people={members.map((m) => ({ id: m.id, label: m.name?.trim() || m.email.split("@")[0], email: m.email, name: m.name }))}
      />
    );
  } else {
    const all = await listLists(household.id);
    const lists = all.filter((l) => (tab === "venta" ? l.type === "sale" : l.type !== "sale"));
    body = (
      <div className="space-y-4">
        {canEdit && <NewListForm presetType={tab === "venta" ? "sale" : "shopping"} />}
        <PendingCreates op="list-create" hint={es.lists.pendingList} />
        {lists.length === 0 ? (
          <p className="card p-4 text-muted">{tab === "venta" ? t.emptySale : t.emptySuper}</p>
        ) : (
          <ul className="space-y-3">
            {lists.map((l) => (
              <li key={l.id}>
                <Link href={`/lists/${l.id}`} className="card flex min-h-[72px] items-center gap-3 p-3">
                  <IconTile tint={l.type === "sale" ? "purple" : "green"} size={48}>
                    {l.type === "sale" ? <WalletIcon width={24} height={24} /> : <ListIcon width={24} height={24} />}
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-extrabold">{l.name}</p>
                    <p className="text-sm text-muted">{es.lists.open(l.open)}</p>
                  </div>
                  <ChevronRightIcon width={20} height={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <PageHeader title={t.title} subtitle={t.subtitle} action={<AvatarStack members={members} label={t.membersLabel} />} />
      <Segmented items={tabs} active={tab} label={t.title} />
      {body}
    </section>
  );
}
