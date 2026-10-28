import { describe, expect, it } from "vitest";
import type { OutboxItem, OutboxMeta } from "./db";
import { overlayListItems, overlayTasks, type ListItemView, type TaskView } from "./overlay";

const ob = (meta: OutboxMeta): OutboxItem => ({ kind: "json", url: "/x", method: "POST", meta, createdAt: 0, attempts: 0 });
const item = (id: string, over: Partial<ListItemView> = {}): ListItemView => ({
  id, title: id, quantity: null, price: null, status: "pending", checked: false, notes: null, photos: [], ...over,
});

describe("overlayListItems", () => {
  it("agrega, actualiza, borra y limpia marcados según la cola", () => {
    const base = [item("a"), item("b", { checked: true }), item("c")];
    const out = overlayListItems(
      base,
      [
        ob({ op: "list-item-add", listId: "L", itemId: "n", data: { title: "Leche" } }),
        ob({ op: "list-item-update", listId: "L", itemId: "a", data: { checked: true } }),
        ob({ op: "list-item-delete", listId: "L", itemId: "c" }),
        ob({ op: "list-clear", listId: "L" }),
      ],
      "L",
    );
    expect(out.map((i) => i.id)).toEqual(["n"]); // "a" quedó marcado y se limpió; b ya estaba marcado; c borrado
    expect(out[0]).toMatchObject({ title: "Leche", pending: true });
  });
  it("ignora cambios de otras listas y rechazados", () => {
    const out = overlayListItems(
      [item("a")],
      [ob({ op: "list-item-delete", listId: "otra", itemId: "a" }), { ...ob({ op: "list-item-delete", listId: "L", itemId: "a" }), error: "HTTP 400" }],
      "L",
    );
    expect(out.map((i) => i.id)).toEqual(["a"]);
  });
  it("no duplica un elemento ya presente en el servidor", () => {
    expect(overlayListItems([item("a")], [ob({ op: "list-item-add", listId: "L", itemId: "a", data: { title: "x" } })], "L")).toHaveLength(1);
  });
});

describe("overlayTasks", () => {
  const task = (id: string, over: Partial<TaskView> = {}): TaskView => ({ id, title: id, notes: null, dueAt: null, repeatRule: null, assignedTo: null, ...over });
  const now = new Date("2026-06-10T12:00:00Z");
  it("completar quita las tareas simples y reprograma las recurrentes", () => {
    const out = overlayTasks(
      [task("a"), task("r", { repeatRule: "1:week", dueAt: "2026-06-01" })],
      [ob({ op: "task-complete", taskId: "a" }), ob({ op: "task-complete", taskId: "r" })],
      now,
    );
    expect(out.map((t) => t.id)).toEqual(["r"]);
    expect(out[0].dueAt).toBe("2026-06-17");
  });
  it("agrega y borra", () => {
    const out = overlayTasks([task("x")], [ob({ op: "task-add", taskId: "n", data: { title: "Pagar luz", dueAt: "2026-07-01" } }), ob({ op: "task-delete", taskId: "x" })], now);
    expect(out).toEqual([expect.objectContaining({ id: "n", title: "Pagar luz", dueAt: "2026-07-01", pending: true })]);
  });
});
