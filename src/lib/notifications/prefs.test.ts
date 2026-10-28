import { describe, expect, it } from "vitest";
import { isEnabled, PREF_DEFAULTS, prefForReminder } from "./prefs";

describe("preferencias de recordatorios", () => {
  it("por defecto todo activo salvo el resumen semanal", () => {
    expect(PREF_DEFAULTS).toEqual({ maintenance: true, warranty: true, tasks: true, weekly: false });
    expect(isEnabled(undefined, "maintenance")).toBe(true);
    expect(isEnabled(undefined, "weekly")).toBe(false);
  });
  it("lo elegido gana sobre el valor por defecto", () => {
    expect(isEnabled(new Map([["maintenance", false]]), "maintenance")).toBe(false);
    expect(isEnabled(new Map([["weekly", true]]), "weekly")).toBe(true);
  });
  it("relaciona cada recordatorio con su preferencia", () => {
    expect(prefForReminder("maintenance")).toBe("maintenance");
    expect(prefForReminder("maintenance_due")).toBe("maintenance");
    expect(prefForReminder("document_expiring")).toBe("warranty");
    expect(prefForReminder("task_due")).toBe("tasks");
    expect(prefForReminder("weekly")).toBe("weekly");
    expect(prefForReminder("otro")).toBeNull();
  });
});
