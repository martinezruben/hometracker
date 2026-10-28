import { describe, expect, it } from "vitest";
import { currentMonth, MONTH_RE, monthRange, shiftMonth } from "./month";

describe("meses", () => {
  it("rango del mes en UTC", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("avanza y retrocede cruzando el año", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-05", 0)).toBe("2026-05");
  });
  it("valida el formato y calcula el mes actual", () => {
    expect(MONTH_RE.test("2026-13")).toBe(false);
    expect(MONTH_RE.test("2026-02")).toBe(true);
    expect(currentMonth(new Date("2026-03-31T23:59:00Z"))).toBe("2026-03");
  });
});
