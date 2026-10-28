import { describe, expect, it } from "vitest";
import { groupTasks, weekBounds, type DoneTaskView, type TaskView } from "./groups";

const t = (id: string, over: Partial<TaskView> = {}): TaskView => ({
  id, title: id, notes: null, dueAt: null, dueTime: null, repeatRule: null, assignedTo: null,
  urgent: false, category: null, stepsTotal: 0, stepsDone: 0, ...over,
});
const done = (id: string, doneAt: string): DoneTaskView => ({ id, title: id, doneAt, doneBy: null, assignedTo: null });

describe("weekBounds", () => {
  it("devuelve lunes y domingo", () => {
    expect(weekBounds("2026-10-28")).toEqual({ start: "2026-10-26", end: "2026-11-01" }); // miércoles
    expect(weekBounds("2026-10-26")).toEqual({ start: "2026-10-26", end: "2026-11-01" }); // lunes
    expect(weekBounds("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-11-01" }); // domingo
  });
});

describe("groupTasks", () => {
  const today = "2026-10-28";
  it("separa hoy (con vencidos), esta semana, más adelante y sin fecha", () => {
    const g = groupTasks(
      [t("vencida", { dueAt: "2026-10-20" }), t("hoy", { dueAt: today }), t("jueves", { dueAt: "2026-10-29" }), t("lejos", { dueAt: "2026-12-01" }), t("sin")],
      [],
      today,
    );
    expect(g.today.map((x) => x.id)).toEqual(["vencida", "hoy"]);
    expect(g.week.map((x) => x.id)).toEqual(["jueves"]);
    expect(g.later.map((x) => x.id)).toEqual(["lejos"]);
    expect(g.undated.map((x) => x.id)).toEqual(["sin"]);
  });
  it("ordena urgentes primero y luego por hora", () => {
    const g = groupTasks(
      [t("c", { dueAt: today, dueTime: "09:00" }), t("a", { dueAt: today, dueTime: "18:00", urgent: true }), t("b", { dueAt: today })],
      [],
      today,
    );
    expect(g.today.map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("calcula el resumen semanal con los hechos de la semana", () => {
    const g = groupTasks(
      [t("hoy", { dueAt: today }), t("vie", { dueAt: "2026-10-30" }), t("lejos", { dueAt: "2026-12-01" })],
      [done("hecha-hoy", "2026-10-28T10:00:00.000Z"), done("hecha-lun", "2026-10-26T08:00:00.000Z"), done("vieja", "2026-10-01T08:00:00.000Z")],
      today,
    );
    expect(g.summary).toEqual({ doneWeek: 2, totalWeek: 4, pendingWeek: 2, todayCount: 1 });
    expect(g.doneToday.map((x) => x.id)).toEqual(["hecha-hoy"]);
    expect(g.olderDone.map((x) => x.id)).toEqual(["vieja"]);
  });
});
