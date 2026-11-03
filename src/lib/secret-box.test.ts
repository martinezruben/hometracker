import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box";

const prev = { s: process.env.SESSION_SECRET, k: process.env.SETTINGS_SECRET };
afterEach(() => {
  process.env.SESSION_SECRET = prev.s;
  if (prev.k === undefined) delete process.env.SETTINGS_SECRET;
  else process.env.SETTINGS_SECRET = prev.k;
});

describe("cifrado de secretos", () => {
  it("ida y vuelta; cada cifrado es distinto y no contiene el texto original", () => {
    process.env.SESSION_SECRET = "una-llave-de-prueba";
    const a = encryptSecret("sk-ant-api03-secreto");
    const b = encryptSecret("sk-ant-api03-secreto");
    expect(a).not.toBe(b);
    expect(a).not.toContain("secreto");
    expect(decryptSecret(a)).toBe("sk-ant-api03-secreto");
  });
  it("con otra llave, o si se altera, no se puede leer (null, sin lanzar)", () => {
    process.env.SESSION_SECRET = "llave-1";
    const packed = encryptSecret("valor");
    process.env.SESSION_SECRET = "llave-2";
    expect(decryptSecret(packed)).toBeNull();
    process.env.SESSION_SECRET = "llave-1";
    const parts = packed.split(".");
    parts[3] = Buffer.from("alterado").toString("base64url");
    expect(decryptSecret(parts.join("."))).toBeNull();
    expect(decryptSecret("basura")).toBeNull();
  });
  it("SETTINGS_SECRET tiene prioridad sobre SESSION_SECRET", () => {
    process.env.SESSION_SECRET = "sesion";
    process.env.SETTINGS_SECRET = "ajustes";
    const packed = encryptSecret("x");
    delete process.env.SETTINGS_SECRET;
    expect(decryptSecret(packed)).toBeNull();
    process.env.SETTINGS_SECRET = "ajustes";
    expect(decryptSecret(packed)).toBe("x");
  });
});
