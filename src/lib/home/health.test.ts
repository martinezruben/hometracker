import { describe, expect, it } from "vitest";
import { healthFactors, healthLevel, healthScore } from "./health";

const none = { overdueMaintenance: 0, soonMaintenance: 0, overdueTasks: 0, expiredDocuments: 0, expiringDocuments: 0 };

describe("salud del hogar", () => {
  it("un hogar sin pendientes vencidos tiene 100", () => {
    expect(healthScore(none)).toBe(100);
  });
  it("resta por cada problema, con tope por categoría", () => {
    expect(healthScore({ ...none, overdueMaintenance: 1 })).toBe(88);
    expect(healthScore({ ...none, soonMaintenance: 2, overdueTasks: 1 })).toBe(89);
    expect(healthScore({ ...none, overdueMaintenance: 20 })).toBe(52); // tope de 48
    expect(healthScore({ overdueMaintenance: 99, soonMaintenance: 99, overdueTasks: 99, expiredDocuments: 99, expiringDocuments: 99 })).toBe(4);
  });
  it("nunca baja de 0 ni sube de 100", () => {
    expect(healthScore(none)).toBeLessThanOrEqual(100);
    expect(healthScore({ overdueMaintenance: 99, soonMaintenance: 99, overdueTasks: 99, expiredDocuments: 99, expiringDocuments: 99 })).toBeGreaterThanOrEqual(0);
  });
  it("etiqueta por nivel", () => {
    expect(healthLevel(86)).toBe("great");
    expect(healthLevel(70)).toBe("good");
    expect(healthLevel(50)).toBe("attention");
    expect(healthLevel(10)).toBe("critical");
  });
  it("explica qué resta: solo categorías con problemas, la más pesada primero, y suma lo que resta el puntaje", () => {
    expect(healthFactors(none)).toEqual([]);
    const input = { ...none, overdueMaintenance: 2, overdueTasks: 1, expiringDocuments: 9 };
    const f = healthFactors(input);
    expect(f.map((x) => x.key)).toEqual(["overdueMaintenance", "expiringDocuments", "overdueTasks"]);
    expect(f.map((x) => x.points)).toEqual([24, 6, 5]);
    expect(100 - f.reduce((n, x) => n + x.points, 0)).toBe(healthScore(input));
  });
});
