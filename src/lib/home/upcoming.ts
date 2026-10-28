import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { daysUntil, dueStatus, type DueStatus } from "@/lib/maintenance/schedule";
import { healthLevel, healthScore, type HealthLevel } from "./health";

const { maintenancePlans, appliances, tasks, documents, users } = schema;

export type UpcomingItem = {
  key: string;
  kind: "maintenance" | "task" | "document";
  title: string;
  /** Equipo, persona asignada o "Documentos". */
  context: string;
  date: Date;
  status: DueStatus;
  days: number;
  href: string;
};

export type HomeOverview = {
  items: UpcomingItem[];
  score: number;
  level: HealthLevel;
  weekCount: number;
  hasOverdue: boolean;
};

/** Próximos mantenimientos, pendientes con fecha y vencimientos de documentos, más el puntaje de salud. */
export async function homeOverview(householdId: string, now = new Date(), limit = 6): Promise<HomeOverview> {
  const [plans, openTasks, docs] = await Promise.all([
    db
      .select({ id: maintenancePlans.id, title: maintenancePlans.title, due: maintenancePlans.nextDue, applianceId: appliances.id, appliance: appliances.name })
      .from(maintenancePlans)
      .innerJoin(appliances, eq(appliances.id, maintenancePlans.applianceId))
      .where(and(eq(maintenancePlans.householdId, householdId), eq(maintenancePlans.active, true), isNull(maintenancePlans.deletedAt), isNull(appliances.deletedAt)))
      .orderBy(asc(maintenancePlans.nextDue))
      .limit(200),
    db
      .select({ id: tasks.id, title: tasks.title, due: tasks.dueAt, assignee: users.name, assigneeEmail: users.email })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assignedTo))
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.doneAt), isNotNull(tasks.dueAt)))
      .orderBy(asc(tasks.dueAt))
      .limit(200),
    db
      .select({ id: documents.id, title: documents.title, due: documents.expiresAt })
      .from(documents)
      .where(and(eq(documents.householdId, householdId), isNull(documents.deletedAt), isNotNull(documents.expiresAt)))
      .orderBy(asc(documents.expiresAt))
      .limit(200),
  ]);

  const all: UpcomingItem[] = [
    ...plans.map((p) => ({ key: `m-${p.id}`, kind: "maintenance" as const, title: p.title, context: p.appliance, date: p.due, href: `/appliances/${p.applianceId}` })),
    ...openTasks.map((t) => ({ key: `t-${t.id}`, kind: "task" as const, title: t.title, context: t.assignee ?? t.assigneeEmail?.split("@")[0] ?? "", date: t.due!, href: "/tasks" })),
    ...docs.map((d) => ({ key: `d-${d.id}`, kind: "document" as const, title: d.title, context: "", date: d.due!, href: `/documents/${d.id}` })),
  ]
    .map((i) => ({ ...i, status: dueStatus(i.date, now), days: daysUntil(i.date, now) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const count = (kind: UpcomingItem["kind"], pred: (i: UpcomingItem) => boolean) => all.filter((i) => i.kind === kind && pred(i)).length;
  const score = healthScore({
    overdueMaintenance: count("maintenance", (i) => i.status === "overdue"),
    soonMaintenance: count("maintenance", (i) => i.status === "soon"),
    overdueTasks: count("task", (i) => i.status === "overdue"),
    expiredDocuments: count("document", (i) => i.status === "overdue"),
    expiringDocuments: count("document", (i) => i.status === "soon" || (i.days > 14 && i.days <= 30)),
  });

  return {
    items: all.slice(0, limit),
    score,
    level: healthLevel(score),
    weekCount: all.filter((i) => i.kind !== "document" && i.days <= 7).length,
    hasOverdue: all.some((i) => i.status === "overdue"),
  };
}
