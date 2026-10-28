import { describe, expect, it } from "vitest";
import { assertRole, ForbiddenError, hasRole } from "./roles";

describe("roles", () => {
  it("ordena viewer < member < admin", () => {
    expect(hasRole("admin", "member")).toBe(true);
    expect(hasRole("member", "member")).toBe(true);
    expect(hasRole("viewer", "member")).toBe(false);
  });

  it("assertRole lanza si no es miembro o no alcanza el rol", () => {
    expect(() => assertRole(null, "viewer")).toThrow(ForbiddenError);
    expect(() => assertRole("viewer", "admin")).toThrow(ForbiddenError);
    expect(assertRole("admin", "admin")).toBe("admin");
  });
});
