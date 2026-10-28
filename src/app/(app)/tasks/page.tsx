import { requireActiveHousehold } from "@/lib/auth/access";
import { listMembers, listTasks } from "@/lib/tasks/data";
import { formatDateOnly } from "@/lib/maintenance/schedule";
import { es } from "@/lib/i18n/es";
import { TasksView } from "@/components/TasksView";

export default async function TasksPage() {
  const { user, household } = await requireActiveHousehold();
  const [{ open, done }, members] = await Promise.all([listTasks(household.id), listMembers(household.id)]);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{es.tasks.title}</h1>
      <TasksView
        canEdit={household.role !== "viewer"}
        currentUserId={user.id}
        members={members.map((m) => ({ id: m.id, label: m.name ?? m.email }))}
        open={open.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          dueAt: t.dueAt ? formatDateOnly(t.dueAt) : null,
          repeatRule: t.repeatRule,
          assignedTo: t.assignedTo,
        }))}
        done={done.map((t) => ({ id: t.id, title: t.title }))}
      />
    </section>
  );
}
