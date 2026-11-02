import { describe, expect, it } from "vitest";
import { buildApplianceTimeline, relativeTime, splitTimeline, type TimelineEvent } from "./timeline";

const now = new Date("2026-11-02T15:00:00Z");
const at = (iso: string) => new Date(iso);

describe("tiempo relativo", () => {
  it("horas y minutos si fue hoy", () => {
    expect(relativeTime(at("2026-11-02T14:58:00Z"), now)).toBe("hace 2 min");
    expect(relativeTime(at("2026-11-02T12:00:00Z"), now)).toBe("hace 3 h");
    expect(relativeTime(at("2026-11-02T15:00:10Z"), now)).toBe("ahora");
  });
  it("ayer, mañana, días y meses", () => {
    expect(relativeTime(at("2026-11-01T10:00:00Z"), now)).toBe("ayer");
    expect(relativeTime(at("2026-11-03T10:00:00Z"), now)).toBe("mañana");
    expect(relativeTime(at("2026-10-28T10:00:00Z"), now)).toBe("hace 5 días");
    expect(relativeTime(at("2026-11-12T10:00:00Z"), now)).toBe("en 10 días");
    expect(relativeTime(at("2027-02-02T10:00:00Z"), now)).toBe("en 3 meses");
    expect(relativeTime(at("2026-03-02T10:00:00Z"), now)).toBe("hace 8 meses");
  });
});

describe("línea de tiempo", () => {
  it("separa futuros (cercano primero) y pasados (reciente primero)", () => {
    const mk = (id: string, iso: string): TimelineEvent => ({ id, at: at(iso), kind: "task", tone: "info", title: id });
    const { upcoming, past } = splitTimeline([mk("a", "2026-12-01T00:00:00Z"), mk("b", "2026-10-01T00:00:00Z"), mk("c", "2026-11-10T00:00:00Z"), mk("d", "2026-10-20T00:00:00Z")], now);
    expect(upcoming.map((e) => e.id)).toEqual(["c", "a"]);
    expect(past.map((e) => e.id)).toEqual(["d", "b"]);
  });

  it("equipo: compra, garantía, servicios hechos y próximos vencimientos con su tono", () => {
    const text = {
      purchased: "Compra",
      warrantyEnds: (past: boolean) => (past ? "Garantía vencida" : "Fin de garantía"),
      planDone: (t: string) => `Hecho: ${t}`,
      doneDetail: (l: { cost: number | null }, next: Date | null) => `${l.cost ?? "-"} → ${next?.toISOString().slice(0, 10) ?? "-"}`,
      dueLabel: (d: number) => `${d} d`,
    };
    const ev = buildApplianceTimeline(
      { id: "x", purchaseDate: at("2025-03-10T00:00:00Z"), warrantyUntil: at("2027-03-10T00:00:00Z") },
      [
        { id: "p1", title: "Filtros", nextDue: at("2026-10-31T00:00:00Z"), intervalValue: 4, intervalUnit: "month" },
        { id: "p2", title: "Revisión", nextDue: at("2026-11-10T00:00:00Z"), intervalValue: 1, intervalUnit: "year" },
        { id: "p3", title: "Anual", nextDue: at("2027-05-01T00:00:00Z"), intervalValue: 1, intervalUnit: "year" },
      ],
      [{ id: "l1", planId: "p1", doneAt: at("2026-06-30T00:00:00Z"), cost: 20, providerId: null, notes: null }],
      now,
      text,
    );
    const by = Object.fromEntries(ev.map((e) => [e.id, e]));
    expect(by["purchase"].tone).toBe("info");
    expect(by["warranty"].tone).toBe("ok");
    expect(by["log-l1"].title).toBe("Hecho: Filtros");
    expect(by["log-l1"].detail).toBe("20 → 2026-10-30");
    expect(by["due-p1"].tone).toBe("overdue");
    expect(by["due-p2"].tone).toBe("soon");
    expect(by["due-p3"].tone).toBe("ok");
    const { upcoming } = splitTimeline(ev, now);
    expect(upcoming.map((e) => e.id)).toEqual(["due-p2", "warranty", "due-p3"]);
  });
});
