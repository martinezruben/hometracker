import { describe, expect, it } from "vitest";
import { SHEET_PER_PAGE, clampMm, fileName, layoutLabel, mmToPx, paginate, repeatEach, resolveSize, sheetCell } from "./sizes";

describe("etiquetas", () => {
  it("convierte mm a píxeles a 300 dpi", () => {
    expect(mmToPx(25.4)).toBe(300);
    expect(mmToPx(62)).toBe(732);
  });
  it("ancha: QR a la izquierda y texto a la derecha, dentro de la etiqueta", () => {
    const l = layoutLabel(62, 29, true);
    expect(l.align).toBe("left");
    expect(l.qr.x).toBeLessThan(l.text!.x);
    expect(l.text!.x + l.text!.w).toBeLessThanOrEqual(62);
    expect(l.qr.y + l.qr.h).toBeLessThanOrEqual(29);
  });
  it("alta o cuadrada: QR arriba y texto debajo, sin salirse", () => {
    for (const [w, h] of [[40, 30], [100, 150], [25, 25]] as const) {
      const l = layoutLabel(w, h, true);
      expect(l.align).toBe("center");
      expect(l.text!.y).toBeGreaterThanOrEqual(l.qr.y + l.qr.h);
      expect(l.text!.y + l.text!.h).toBeLessThanOrEqual(h);
      expect(l.qr.x + l.qr.w).toBeLessThanOrEqual(w);
    }
  });
  it("sin texto el QR queda centrado y ocupa casi todo", () => {
    const l = layoutLabel(50, 30, false);
    expect(l.text).toBeNull();
    expect(l.qr.x + l.qr.w / 2).toBeCloseTo(25);
    expect(l.qr.w).toBeGreaterThan(24);
  });
  it("hoja A4: 21 por página y celdas dentro del papel", () => {
    expect(SHEET_PER_PAGE).toBe(21);
    const last = sheetCell(20);
    expect(last.x + last.w).toBeLessThanOrEqual(210);
    expect(last.y + last.h).toBeLessThanOrEqual(297);
    expect(sheetCell(21)).toEqual(sheetCell(0)); // la 22 abre otra página
    expect(paginate(Array.from({ length: 22 }, (_, i) => i), 21).map((p) => p.length)).toEqual([21, 1]);
  });
  it("copias, tamaño personalizado y nombre de archivo", () => {
    expect(repeatEach(["a", "b"], 2)).toEqual(["a", "a", "b", "b"]);
    expect(clampMm(5)).toBe(15);
    expect(clampMm(999)).toBe(300);
    expect(resolveSize("custom", 70, 40)).toMatchObject({ w: 70, h: 40 });
    expect(resolveSize("nope", 0, 0).id).toBe("50x30");
    expect(fileName("Caja Ñandú #7", resolveSize("50x30", 0, 0))).toBe("etiqueta-caja-nandu-7-50x30mm.png");
    expect(fileName("X", resolveSize("a4", 0, 0))).toBe("etiqueta-x-A4.png");
  });
});
