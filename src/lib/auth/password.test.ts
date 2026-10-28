import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("contraseñas (scrypt)", () => {
  it("verifica la correcta y rechaza la incorrecta", async () => {
    const h = await hashPassword("una-clave-larga");
    expect(await verifyPassword("una-clave-larga", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
  });
  it("usa sal distinta cada vez y tolera hashes mal formados", async () => {
    expect(await hashPassword("x1234567")).not.toBe(await hashPassword("x1234567"));
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
