import { describe, expect, it } from "vitest";
import { qrSvg } from "./qr";
import { boxUrl } from "./config";

describe("qrSvg", () => {
  it("genera un SVG para la URL de la caja", async () => {
    const svg = await qrSvg(boxUrl("11111111-1111-4111-8111-111111111111"));
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
