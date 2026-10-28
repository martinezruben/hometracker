import QRCode from "qrcode";

/** QR como SVG (vectorial, nítido al imprimir). */
export function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
