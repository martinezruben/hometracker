import { describe, expect, it } from "vitest";
import { repeatText, taskSubtitle, timeLabel } from "./format";
import type { TaskView } from "./groups";

const base: TaskView = { id: "1", title: "x", notes: null, dueAt: null, dueTime: null, repeatRule: null, assignedTo: null, urgent: false, category: null, stepsTotal: 0, stepsDone: 0 };

describe("formato de pendientes", () => {
  it("hora en formato 12 h con a. m./p. m.", () => {
    expect(timeLabel("18:00")).toBe("6:00 p. m.");
    expect(timeLabel("08:05")).toBe("8:05 a. m.");
    expect(timeLabel("00:30")).toBe("12:30 a. m.");
    expect(timeLabel("12:00")).toBe("12:00 p. m.");
  });
  it("texto de repetición", () => {
    expect(repeatText("1:week")).toBe("Cada semana");
    expect(repeatText("2:week")).toBe("Cada 2 semanas");
    expect(repeatText(null)).toBeNull();
  });
  it("arma el subtítulo en orden", () => {
    expect(taskSubtitle({ ...base, dueTime: "18:00", category: "Equipos" })).toEqual(["6:00 p. m.", "Equipos"]);
    expect(taskSubtitle({ ...base, dueAt: "2026-10-29", stepsTotal: 4, stepsDone: 2 }, { showWeekday: true })).toEqual(["Jueves", "2 de 4 pasos"]);
    expect(taskSubtitle({ ...base, repeatRule: "1:week" })).toEqual(["Cada semana"]);
  });
});
