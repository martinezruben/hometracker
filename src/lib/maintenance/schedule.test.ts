import { describe, expect, it } from "vitest";
import {
  addInterval,
  daysUntil,
  dueStatus,
  formatDateOnly,
  nextDueAfter,
  parseDateOnly,
  reminderFireAt,
} from "./schedule";

const d = parseDateOnly;
const f = formatDateOnly;

describe("addInterval", () => {
  it("suma días y semanas", () => {
    expect(f(addInterval(d("2026-01-30"), 3, "day"))).toBe("2026-02-02");
    expect(f(addInterval(d("2026-01-01"), 2, "week"))).toBe("2026-01-15");
  });
  it("ajusta fin de mes", () => {
    expect(f(addInterval(d("2026-01-31"), 1, "month"))).toBe("2026-02-28");
    expect(f(addInterval(d("2028-01-31"), 1, "month"))).toBe("2028-02-29");
    expect(f(addInterval(d("2026-08-31"), 1, "month"))).toBe("2026-09-30");
  });
  it("suma años y cruza de año con meses", () => {
    expect(f(addInterval(d("2028-02-29"), 1, "year"))).toBe("2029-02-28");
    expect(f(addInterval(d("2026-11-15"), 3, "month"))).toBe("2027-02-15");
    expect(f(addInterval(d("2026-05-10"), 6, "month"))).toBe("2026-11-10");
  });
  it("restar días (recordatorios)", () => {
    expect(f(reminderFireAt(d("2026-03-05"), 7))).toBe("2026-02-26");
  });
});

describe("estado de vencimiento", () => {
  const now = new Date("2026-06-10T15:00:00.000Z");
  it("calcula días y estado", () => {
    expect(daysUntil(d("2026-06-10"), now)).toBe(0);
    expect(daysUntil(d("2026-06-09"), now)).toBe(-1);
    expect(dueStatus(d("2026-06-09"), now)).toBe("overdue");
    expect(dueStatus(d("2026-06-10"), now)).toBe("soon");
    expect(dueStatus(d("2026-06-24"), now)).toBe("soon");
    expect(dueStatus(d("2026-06-25"), now)).toBe("ok");
  });
  it("el próximo vencimiento cuenta desde que se hizo", () => {
    expect(f(nextDueAfter(d("2026-06-12"), 6, "month"))).toBe("2026-12-12");
  });
});
