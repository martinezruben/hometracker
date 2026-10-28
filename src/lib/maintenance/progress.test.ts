import { describe, expect, it } from "vitest";
import { intervalLabel, planProgress } from "./progress";
import { parseDateOnly } from "./schedule";

const d = parseDateOnly;

describe("planProgress", () => {
  it("avanza entre el ciclo anterior y el vencimiento", () => {
    // ciclo de 4 semanas: del 2026-06-01 al 2026-06-29
    expect(planProgress(d("2026-06-29"), 4, "week", d("2026-06-01"))).toBe(0);
    expect(planProgress(d("2026-06-29"), 4, "week", d("2026-06-15"))).toBeCloseTo(0.5, 5);
    expect(planProgress(d("2026-06-29"), 4, "week", d("2026-06-29"))).toBe(1);
  });
  it("se queda en 1 si ya venció y en 0 si falta más de un ciclo", () => {
    expect(planProgress(d("2026-06-29"), 4, "week", d("2026-08-01"))).toBe(1);
    expect(planProgress(d("2026-06-29"), 4, "week", d("2026-01-01"))).toBe(0);
  });
});

describe("intervalLabel", () => {
  it("usa singular y plural", () => {
    expect(intervalLabel(1, "year")).toBe("cada año");
    expect(intervalLabel(3, "month")).toBe("cada 3 meses");
    expect(intervalLabel(2, "week")).toBe("cada 2 semanas");
    expect(intervalLabel(1, "day")).toBe("cada día");
  });
});
