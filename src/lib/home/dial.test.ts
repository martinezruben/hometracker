import { describe, expect, it } from "vitest";
import { arcPath, dialMarks, greetingKey, nextUp, polar, skyPhase, untilLabel } from "./dial";

const t = (id: string, over: Partial<{ title: string; dueAt: string | null; dueTime: string | null; urgent: boolean }> = {}) => ({
  id, title: id, dueAt: "2026-11-02", dueTime: null, urgent: false, ...over,
});

describe("geometría del dial", () => {
  it("0 h arriba, 6 h a la derecha, 12 h abajo, 18 h a la izquierda", () => {
    expect(polar(150, 150, 100, 0)).toEqual([150, 50]);
    expect(polar(150, 150, 100, 6)).toEqual([250, 150]);
    expect(polar(150, 150, 100, 12)).toEqual([150, 250]);
    expect(polar(150, 150, 100, 18)).toEqual([50, 150]);
  });
  it("el arco marca 'grande' solo si pasa de 12 h", () => {
    expect(arcPath(150, 150, 100, 0, 6)).toBe("M150 50A100 100 0 0 1 250 150");
    expect(arcPath(150, 150, 100, 0, 18)).toContain("A100 100 0 1 1");
  });
});

describe("cielo y saludo", () => {
  it("fase según la hora", () => {
    expect([2, 6, 12, 18, 21].map(skyPhase)).toEqual(["night", "dawn", "day", "dusk", "night"]);
    expect([6, 12, 19].map(greetingKey)).toEqual(["morning", "afternoon", "evening"]);
  });
});

describe("marcas del día", () => {
  const local = (iso: string) => ({ day: iso.slice(0, 10), hour: Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60 });
  it("solo los pendientes de hoy con hora y lo completado hoy, en orden", () => {
    const marks = dialMarks(
      [t("a", { dueTime: "10:00" }), t("sin-hora"), t("ayer", { dueAt: "2026-11-01", dueTime: "09:00" }), t("b", { dueTime: "07:30" })],
      [{ id: "x", title: "Hecho", doneAt: "2026-11-02T06:20:00.000Z" }, { id: "y", title: "Viejo", doneAt: "2026-10-31T06:20:00.000Z" }],
      "2026-11-02",
      local,
    );
    expect(marks.map((m) => [m.id, m.kind])).toEqual([["done-x", "done"], ["b", "task"], ["a", "task"]]);
    expect(marks[1].from).toBe(7.5);
    expect(marks[2].to).toBeGreaterThan(marks[2].from);
  });
  it("no se sale de las 24 h", () => {
    const [m] = dialMarks([t("n", { dueTime: "23:55" })], [], "2026-11-02", () => ({ day: "", hour: 0 }));
    expect(m.to).toBe(24);
  });
});

describe("siguiente pendiente", () => {
  it("el de hora más cercana que aún no llegó, con minutos", () => {
    const r = nextUp([t("tarde", { dueTime: "16:00" }), t("pronto", { dueTime: "10:00" })], "2026-11-02", 6.32);
    expect(r?.task.id).toBe("pronto");
    expect(r?.minutes).toBe(221);
  });
  it("sin horas pendientes: uno de hoy sin hora (urgente primero), luego vencidos", () => {
    expect(nextUp([t("a"), t("b", { urgent: true })], "2026-11-02", 9)?.task.id).toBe("b");
    expect(nextUp([t("viejo", { dueAt: "2026-10-30" }), t("masviejo", { dueAt: "2026-10-01" })], "2026-11-02", 9)?.task.id).toBe("masviejo");
  });
  it("si ya pasó la hora y no hay más, muestra el último con hora; sin nada, null", () => {
    expect(nextUp([t("pasado", { dueTime: "08:00" })], "2026-11-02", 15)?.task.id).toBe("pasado");
    expect(nextUp([], "2026-11-02", 15)).toBeNull();
  });
  it("etiqueta de tiempo", () => {
    expect([0, 25, 60, 221].map(untilLabel)).toEqual(["ahora", "25 min", "1 h", "3 h 41 min"]);
  });
});
