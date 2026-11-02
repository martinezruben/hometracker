import { describe, expect, it } from "vitest";
import { buildBoxTimeline, categoryBreakdown } from "./insights";

describe("reparto por categoría", () => {
  it("suma unidades, ordena de mayor a menor y deja 'sin categoría' al final", () => {
    const r = categoryBreakdown([
      { quantity: 2, category: "Eléctrico" },
      { quantity: 6, category: "Navidad" },
      { quantity: 1, category: " Eléctrico " },
      { quantity: 3, category: null },
      { quantity: 0, category: "Vacío" },
    ]);
    expect(r.map((x) => [x.category, x.units])).toEqual([["Navidad", 6], ["Eléctrico", 3], ["Vacío", 0], [null, 3]]);
  });
  it("los porcentajes siempre suman 100", () => {
    const r = categoryBreakdown([{ quantity: 1, category: "a" }, { quantity: 1, category: "b" }, { quantity: 1, category: "c" }]);
    expect(r.reduce((n, x) => n + x.pct, 0)).toBe(100);
  });
  it("sin objetos no hay reparto", () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe("línea de tiempo de la caja", () => {
  const d = (iso: string) => new Date(iso);
  const text = { created: "Caja creada", itemAdded: (t: string, q: number) => `${t} ×${q}`, photoAdded: "Foto" };
  it("ordena del más reciente al más antiguo y respeta el límite", () => {
    const ev = buildBoxTimeline(
      { id: "b", createdAt: d("2026-10-01T10:00:00Z") },
      [{ id: "1", title: "Luces", quantity: 3, category: "Navidad", createdAt: d("2026-10-02T10:00:00Z") }],
      [{ id: "p", createdAt: d("2026-10-03T10:00:00Z") }],
      text,
    );
    expect(ev.map((e) => e.title)).toEqual(["Foto", "Luces ×3", "Caja creada"]);
    expect(ev[1].detail).toBe("Navidad");
    expect(buildBoxTimeline({ id: "b", createdAt: d("2026-10-01T00:00:00Z") }, [], [{ id: "x", createdAt: d("2026-10-02T00:00:00Z") }, { id: "y", createdAt: d("2026-10-03T00:00:00Z") }], text, 2)).toHaveLength(2);
  });
});
