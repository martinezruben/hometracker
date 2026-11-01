"use client";

import QRCode from "qrcode";
import { DPI, SHEET, SHEET_PER_PAGE, layoutLabel, mmToPx, paginate, sheetCell, type LabelSize } from "./sizes";

export type LabelItem = { id: string; title: string; subtitle?: string; badge?: string; url: string };
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/**
 * Dibuja una etiqueta en `ctx` con su esquina superior izquierda en (ox, oy) píxeles:
 * marco redondeado, QR nítido, insignia ("CAJA N.º 07"), título, subtítulo y pie con la marca.
 * Solo usa negro, blanco y grises para que salga bien en impresoras térmicas.
 */
function drawLabel(ctx: CanvasRenderingContext2D, item: LabelItem, wMm: number, hMm: number, ox: number, oy: number, opt: RenderOptions) {
  const px = (mm: number) => (mm / 25.4) * DPI;
  const lay = layoutLabel(wMm, hMm, opt.showText);
  const u = px(Math.min(wMm, hMm));

  // Marco redondeado fino.
  const inset = px(0.45);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = Math.max(2, px(0.3));
  roundRectPath(ctx, ox + inset, oy + inset, px(wMm) - 2 * inset, px(hMm) - 2 * inset, u * 0.09);
  ctx.stroke();

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
  const center = lay.align === "center";
  const anchorX = center ? tx + tw / 2 : tx;
  ctx.textBaseline = "top";
  ctx.textAlign = center ? "center" : "left";

  // En etiquetas anchas, un filete vertical separa el QR del texto.
  if (!center) {
    const lx = tx - px(lay.qr.x) / 2 - 1;
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.25;
    ctx.fillRect(lx, oy + px(lay.qr.y) + px(lay.qr.h) * 0.08, Math.max(1, px(0.2)), px(lay.qr.h) * 0.84);
    ctx.globalAlpha = 1;
  }

  const bottom = oy + px(t.y) + th;
  let top = oy + px(t.y);

  // Pie: filete y marca; si hay sitio, la indicación de escaneo.
  const showFooter = t.h >= 13;
  const fs = clamp(u * 0.075, px(1.5), px(2.4));
  const footerH = showFooter ? fs * 2.5 : 0;
  if (showFooter) {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.25;
    ctx.fillRect(tx, bottom - footerH, tw, Math.max(1, px(0.2)));
    ctx.globalAlpha = 1;
    const fy = bottom - footerH + fs * 0.9;
    ctx.fillStyle = "#000";
    let bf = fs;
    ctx.textAlign = "left";
    for (; bf > px(0.9); bf -= 0.5) {
      ctx.font = `800 ${bf}px ${FONT}`;
      setSpacing(ctx, bf * 0.14);
      if (ctx.measureText("HOMETRACKER").width <= tw) break;
    }
    ctx.fillText("HOMETRACKER", tx, fy);
    const brandW = ctx.measureText("HOMETRACKER").width;
    setSpacing(ctx, 0);
    if (lay.hint && tw - brandW > fs * 8) {
      ctx.font = `500 ${fs}px ${FONT}`;
      ctx.fillStyle = "#444";
      ctx.textAlign = "right";
      ctx.fillText(wrap(ctx, opt.hint, tw - brandW - fs, 1)[0], tx + tw, fy);
    }
    ctx.textAlign = center ? "center" : "left";
  }

  // Insignia (píldora negra): "CAJA N.º 07", "EQUIPO"…
  const gap = u * 0.06;
  if (item.badge && t.h >= 11) {
    const bs = clamp(u * 0.085, px(1.6), px(3.2));
    ctx.font = `800 ${bs}px ${FONT}`;
    setSpacing(ctx, bs * 0.1);
    const label = item.badge.toUpperCase();
    const pw = Math.min(tw, ctx.measureText(label).width + bs * 1.8);
    const ph = bs * 1.85;
    const px0 = center ? tx + (tw - pw) / 2 : tx;
    ctx.fillStyle = "#000";
    roundRectPath(ctx, px0, top, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(label, px0 + pw / 2 + bs * 0.05, top + (ph - bs) / 2);
    setSpacing(ctx, 0);
    ctx.textAlign = center ? "center" : "left";
    top += ph + gap * 1.4;
  }

  // Título: lo más grande que quepa en hasta 2 líneas; subtítulo en gris debajo.
  const subSize = item.subtitle ? clamp(u * 0.11, px(1.8), px(3.6)) : 0;
  const subH = item.subtitle ? subSize * 1.5 : 0;
  const titleBox = Math.max(px(3), bottom - footerH - top - subH - gap);
  let size = Math.min(u * 0.24, titleBox / 1.12);
  let lines: string[] = [];
  for (; size > px(1.6); size -= 1) {
    ctx.font = `800 ${size}px ${FONT}`;
    lines = wrap(ctx, item.title, tw, 2);
    if (lines.length * size * 1.12 <= titleBox && lines.every((l) => ctx.measureText(l).width <= tw)) break;
  }
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.fillStyle = "#000";
  let y = top;
  for (const l of lines) {
    ctx.fillText(l, anchorX, y);
    y += size * 1.12;
  }
  if (item.subtitle) {
    const ss = Math.min(subSize, size * 0.62);
    ctx.font = `600 ${ss}px ${FONT}`;
    ctx.fillStyle = "#444";
    ctx.fillText(wrap(ctx, item.subtitle, tw, 1)[0], anchorX, y + ss * 0.25);
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
