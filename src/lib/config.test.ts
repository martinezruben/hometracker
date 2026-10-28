import { describe, expect, it } from "vitest";
import { boxUrl } from "./config";

describe("boxUrl", () => {
  it("construye la URL de la caja con la URL base", () => {
    expect(boxUrl("abc")).toMatch(/\/b\/abc$/);
  });
});
