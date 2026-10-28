import { describe, expect, it } from "vitest";
import { extractTarget, targetPath } from "./qr-scan";

const id = "3f2b8c1e-5d4a-4b7e-9c10-1a2b3c4d5e6f";

describe("extractTarget", () => {
  it("reconoce cajas y equipos", () => {
    expect(extractTarget(`https://casa.example.com/b/${id}`)).toEqual({ kind: "box", id });
    expect(extractTarget(`http://localhost:3000/e/${id.toUpperCase()}/`)).toEqual({ kind: "appliance", id });
  });
  it("arma la ruta interna", () => {
    expect(targetPath({ kind: "box", id })).toBe(`/b/${id}`);
    expect(targetPath({ kind: "appliance", id })).toBe(`/appliances/${id}`);
  });
  it("ignora QR ajenos", () => {
    expect(extractTarget("https://example.com/otra/cosa")).toBeNull();
    expect(extractTarget(`https://example.com/b/${id}/label`)).toBeNull();
    expect(extractTarget(`https://example.com/x/${id}`)).toBeNull();
    expect(extractTarget("hola")).toBeNull();
  });
});
