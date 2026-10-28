import { describe, expect, it } from "vitest";
import { cleanPhone, contactCreate } from "./schemas";

describe("contactos", () => {
  it("limpia teléfonos para tel: y WhatsApp", () => {
    expect(cleanPhone("+52 (55) 1234-5678")).toBe("+525512345678");
    expect(cleanPhone("809 555 1234")).toBe("8095551234");
  });
  it("valida correo y calificación", () => {
    expect(contactCreate.safeParse({ name: "Ana", email: "no-es-correo" }).success).toBe(false);
    expect(contactCreate.safeParse({ name: "Ana", email: "" }).success).toBe(true);
    expect(contactCreate.safeParse({ name: "Ana", rating: 6 }).success).toBe(false);
    expect(contactCreate.safeParse({ name: "Ana", rating: 5 }).success).toBe(true);
  });
});
