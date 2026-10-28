import { describe, expect, it } from "vitest";
import { extractBoxId } from "./qr-scan";

const id = "3f2b8c1e-5d4a-4b7e-9c10-1a2b3c4d5e6f";

describe("extractBoxId", () => {
  it("lee el id de la URL de una caja", () => {
    expect(extractBoxId(`https://casa.example.com/b/${id}`)).toBe(id);
    expect(extractBoxId(`http://localhost:3000/b/${id.toUpperCase()}/`)).toBe(id);
  });
  it("ignora QR ajenos", () => {
    expect(extractBoxId("https://example.com/otra/cosa")).toBeNull();
    expect(extractBoxId(`https://example.com/b/${id}/label`)).toBeNull();
    expect(extractBoxId("hola")).toBeNull();
  });
});
