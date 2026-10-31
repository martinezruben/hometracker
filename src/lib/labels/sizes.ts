/** Tamaños de etiqueta y su composición (puro, sin DOM). Medidas en milímetros. */

export type LabelSize = { id: string; name: string; w: number; h: number; sheet?: boolean };

export const DPI = 300;
export const mmToPx = (mm: number, dpi = DPI) => Math.round((mm / 25.4) * dpi);

/** Hoja A4 con etiquetas 63,5 × 38,1 mm, 3 columnas × 7 filas (formato Avery L7160). */
export const SHEET = { pageW: 210, pageH: 297, cols: 3, rows: 7, cellW: 63.5, cellH: 38.1, gapX: 2.5, gapY: 0, left: 7.2, top: 15.1 } as const;
export const SHEET_PER_PAGE = SHEET.cols * SHEET.rows;

export const PRESETS: LabelSize[] = [
  { id: "25x25", name: "25 × 25 mm · solo QR pequeño", w: 25, h: 25 },
  { id: "40x30", name: "40 × 30 mm · térmica", w: 40, h: 30 },
  { id: "50x30", name: "50 × 30 mm · térmica", w: 50, h: 30 },
  { id: "62x29", name: "62 × 29 mm · Brother DK", w: 62, h: 29 },
  { id: "100x50", name: "100 × 50 mm · térmica grande", w: 100, h: 50 },
  { id: "100x150", name: "100 × 150 mm · 4 × 6 in", w: 100, h: 150 },
  { id: "a4", name: "Hoja A4 · 21 etiquetas (63,5 × 38,1 mm)", w: SHEET.cellW, h: SHEET.cellH, sheet: true },
];

export const CUSTOM_ID = "custom";
export const CUSTOM_MIN = 15;
export const CUSTOM_MAX = 300;
export const clampMm = (n: number) => Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Number.isFinite(n) ? n : CUSTOM_MIN));

export function resolveSize(id: string, customW: number, customH: number): LabelSize {
  if (id === CUSTOM_ID) return { id, name: "Personalizado", w: clampMm(customW), h: clampMm(customH) };
  return PRESETS.find((p) => p.id === id) ?? PRESETS[2];
}

export type Rect = { x: number; y: number; w: number; h: number };
export type LabelLayout = { qr: Rect; text: Rect | null; align: "left" | "center"; hint: boolean };

/**
 * Reparte el espacio: si la etiqueta es ancha, QR a la izquierda y texto a la derecha;
 * si es alta o cuadrada, QR arriba y texto debajo. Sin texto, el QR ocupa todo.
 */
export function layoutLabel(w: number, h: number, showText: boolean): LabelLayout {
  const m = Math.min(w, h) * 0.06;
  if (!showText) {
    const s = Math.min(w, h) - 2 * m;
    return { qr: { x: (w - s) / 2, y: (h - s) / 2, w: s, h: s }, text: null, align: "center", hint: false };
  }
  if (w / h >= 1.5) {
    const s = h - 2 * m;
    return {
      qr: { x: m, y: m, w: s, h: s },
      text: { x: m + s + m, y: m, w: w - (m + s + m) - m, h: s },
      align: "left",
      hint: h >= 45,
    };
  }
  const s = Math.min(w - 2 * m, h * 0.66);
  return {
    qr: { x: (w - s) / 2, y: m, w: s, h: s },
    text: { x: m, y: m + s + m * 0.6, w: w - 2 * m, h: h - (m + s + m * 0.6) - m },
    align: "center",
    hint: h >= 60,
  };
}

/** Posición (mm) de la celda `i` dentro de una hoja de etiquetas. */
export function sheetCell(i: number): Rect {
  const col = i % SHEET.cols;
  const row = Math.floor(i / SHEET.cols) % SHEET.rows;
  return { x: SHEET.left + col * (SHEET.cellW + SHEET.gapX), y: SHEET.top + row * (SHEET.cellH + SHEET.gapY), w: SHEET.cellW, h: SHEET.cellH };
}

/** Reparte en hojas: devuelve una lista de páginas, cada una con hasta `perPage` elementos. */
export function paginate<T>(list: T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < list.length; i += perPage) pages.push(list.slice(i, i + perPage));
  return pages;
}

/** Repite cada elemento `copies` veces, conservando el orden. */
export const repeatEach = <T,>(list: T[], copies: number) => list.flatMap((x) => Array.from({ length: Math.max(1, copies) }, () => x));

export const fileName = (title: string, size: LabelSize) =>
  `etiqueta-${title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr"}-${size.sheet ? "A4" : `${size.w}x${size.h}mm`}.png`;
