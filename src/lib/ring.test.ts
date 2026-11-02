import { describe, expect, it } from "vitest";
import { ringArcs } from "./ring";

describe("anillo por segmentos", () => {
  it("un arco por segmento con valor; los vacíos son null", () => {
    const arcs = ringArcs(60, 60, 44, [7, 0, 2]);
    expect(arcs[0]).toMatch(/^M/);
    expect(arcs[1]).toBeNull();
    expect(arcs[2]).toMatch(/^M/);
  });
  it("un solo segmento da el círculo completo (arco grande)", () => {
    expect(ringArcs(60, 60, 44, [5, 0, 0])[0]).toContain("A44 44 0 1 1");
  });
  it("sin datos no hay arcos", () => {
    expect(ringArcs(60, 60, 44, [0, 0, 0])).toEqual([null, null, null]);
  });
  it("el segmento mayor a media vuelta usa el arco grande", () => {
    expect(ringArcs(60, 60, 44, [7, 1, 1])[0]).toContain("A44 44 0 1 1");
    expect(ringArcs(60, 60, 44, [1, 1, 1])[0]).toContain("A44 44 0 0 1");
  });
});
