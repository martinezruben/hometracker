import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, normalizeEmail, randomToken, safeEqualHex, sha256 } from "./crypto";

describe("crypto", () => {
  it("genera OTP de 6 dígitos", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("el hash del OTP depende del correo", () => {
    expect(hashOtp("a@x.com", "123456")).not.toBe(hashOtp("b@x.com", "123456"));
    expect(safeEqualHex(hashOtp("a@x.com", "123456"), hashOtp("a@x.com", "123456"))).toBe(true);
    expect(safeEqualHex(hashOtp("a@x.com", "123456"), hashOtp("a@x.com", "654321"))).toBe(false);
  });

  it("tokens aleatorios y hash estable", () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(sha256("x")).toHaveLength(64);
    expect(normalizeEmail("  Ana@Mail.COM ")).toBe("ana@mail.com");
  });
});
