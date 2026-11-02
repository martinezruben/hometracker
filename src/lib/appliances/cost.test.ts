import { describe, expect, it } from "vitest";
import { costByMonth } from "./cost";

describe("gasto por mes", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  it("seis meses hasta el actual, sumando costos y sin contar los vacíos", () => {
    const r = costByMonth(
      [
        { doneAt: new Date("2026-11-01T10:00:00Z"), cost: 35 },
        { doneAt: new Date("2026-11-02T01:00:00Z"), cost: 10.5 },
        { doneAt: new Date("2026-08-15T10:00:00Z"), cost: 20 },
        { doneAt: new Date("2026-09-10T10:00:00Z"), cost: null },
        { doneAt: new Date("2026-04-10T10:00:00Z"), cost: 99 }, // fuera de la ventana
      ],
      now,
    );
    expect(r.map((m) => m.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(r.map((m) => m.total)).toEqual([0, 0, 20, 0, 0, 45.5]);
    expect(r[5].label).toBe("Nov");
  });
  it("cruza el cambio de año", () => {
    expect(costByMonth([], new Date("2027-01-15T00:00:00Z"), 3).map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
