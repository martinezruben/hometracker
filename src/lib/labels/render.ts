"use client";

import QRCode from "qrcode";
import { DPI, SHEET, SHEET_PER_PAGE, layoutLabel, mmToPx, paginate, sheetCell, type LabelSize } from "./sizes";

export type LabelItem = { id: string; title: string; subtitle?: string; url: string };
export type RenderOptions = { showText: boolean; hint: string };

const FONT = 'Manrope, system-ui, -apple-system, "Segoe UI", sans-serif';

function newCanvas(wMm: number, hMm: number) {
  const canvas = document.createElement("canvas");
  canvas.width = mmToPx(wMm);
  canvas.height = mmToPx(hMm);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** Parte `text` en líneas que quepan en `maxW` (como máximo `maxLines`, con puntos suspensivos). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

/** Dibuja una etiqueta (QR + texto) en `ctx`, con su esquina superior izquierda en (ox, oy) píxeles. */
function drawLabel(ctx: CanvasRenderingContext2D, item: LabelItem, wMm: number, hMm: number, ox: number, oy: number, opt: RenderOptions) {
  const px = (mm: number) => (mm / 25.4) * DPI;
  const lay = layoutLabel(wMm, hMm, opt.showText);

  // QR: módulos enteros en píxeles para que quede nítido; zona de silencio de 1 módulo.
  const qr = QRCode.create(item.url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const box = px(lay.qr.w);
  const cell = Math.max(1, Math.floor(box / (n + 2)));
  const used = cell * (n + 2);
  const qx = ox + px(lay.qr.x) + (box - used) / 2 + cell;
  const qy = oy + px(lay.qr.y) + (box - used) / 2 + cell;
  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, cell, cell);

  if (!lay.text) return;
  const t = lay.text;
  const tx = ox + px(t.x);
  const tw = px(t.w);
  const th = px(t.h);
  ctx.textBaseline = "top";
  ctx.textAlign = lay.align === "center" ? "center" : "left";
  const anchorX = lay.align === "center" ? tx + tw / 2 : tx;

  // Tamaño del título: lo más grande que quepa en hasta 2 líneas dentro del alto disponible.
  const hintPx = lay.hint ? Math.min(px(2.6), th * 0.16) : 0;
  const subMax = item.subtitle ? 0.34 : 0;
  const titleBox = th - hintPx * 1.6 - th * subMax;
  let size = Math.min(px(Math.min(wMm, hMm) * 0.2), titleBox / 1.15);
  let lines: string[] = [];
  for (; size > px(1.6); size -= 1) {
    ctx.font = `800 ${size}px ${FONT}`;
    lines = wrap(ctx, item.title, tw, 2);
    if (lines.length * size * 1.15 <= titleBox && lines.every((l) => ctx.measureText(l).width <= tw)) break;
  }
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.fillStyle = "#000";
  let y = oy + px(t.y);
  for (const l of lines) {
    ctx.fillText(l, anchorX, y);
    y += size * 1.15;
  }
  if (item.subtitle) {
    const sub = Math.min(size * 0.62, th * subMax * 0.8);
    ctx.font = `600 ${sub}px ${FONT}`;
    ctx.fillStyle = "#333";
    const [s] = wrap(ctx, item.subtitle, tw, 1);
    ctx.fillText(s, anchorX, y + sub * 0.15);
    y += sub * 1.3;
  }
  if (hintPx) {
    ctx.font = `500 ${hintPx}px ${FONT}`;
    ctx.fillStyle = "#555";
    const [h] = wrap(ctx, opt.hint, tw, 1);
    ctx.fillText(h, anchorX, oy + px(t.y) + th - hintPx * 1.2);
  }
}

export async function fontsReady() {
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch {}
}

/** Una etiqueta del tamaño pedido, lista para imprimir o descargar. */
export function renderLabel(item: LabelItem, size: LabelSize, opt: RenderOptions) {
  const { canvas, ctx } = newCanvas(size.w, size.h);
  drawLabel(ctx, item, size.w, size.h, 0, 0, opt);
  return canvas.toDataURL("image/png");
}

/** Hojas A4 con las etiquetas repartidas en la cuadrícula (21 por hoja). */
export function renderSheets(items: LabelItem[], opt: RenderOptions) {
  return paginate(items, SHEET_PER_PAGE).map((page) => {
    const { canvas, ctx } = newCanvas(SHEET.pageW, SHEET.pageH);
    page.forEach((item, i) => {
      const c = sheetCell(i);
      drawLabel(ctx, item, c.w, c.h, mmToPx(c.x), mmToPx(c.y), opt);
    });
    return canvas.toDataURL("image/png");
  });
}
