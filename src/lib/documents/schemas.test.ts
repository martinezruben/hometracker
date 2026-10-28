import { describe, expect, it } from "vitest";
import { documentCreate, mimeFromKey } from "./schemas";

describe("documentos", () => {
  it("convierte fechas y valida tipo", () => {
    const ok = documentCreate.parse({ kind: "contract", title: "Seguro", expiresAt: "2027-03-01" });
    expect(ok.expiresAt?.toISOString()).toBe("2027-03-01T00:00:00.000Z");
    expect(documentCreate.safeParse({ kind: "otro", title: "x" }).success).toBe(false);
    expect(documentCreate.safeParse({ kind: "receipt", title: "" }).success).toBe(false);
  });
  it("deduce el tipo MIME de la llave", () => {
    expect(mimeFromKey("hh/docs/abc.pdf")).toBe("application/pdf");
    expect(mimeFromKey("hh/docs/abc.jpg")).toBe("image/jpeg");
    expect(mimeFromKey("hh/docs/abc.exe")).toBe("application/octet-stream");
  });
});
