import { addInterval } from "@/lib/maintenance/schedule";
import type { OutboxItem } from "./db";

// Aplica sobre los datos del servidor los cambios que aún están en la cola local,
// para que la pantalla refleje lo que la persona hizo aunque no haya conexión.

export type ListItemView = {
  id: string;
  title: string;
  quantity: string | null;
  price: number | null;
  status: "pending" | "done" | "available" | "sold";
  checked: boolean;
  notes: string | null;
  photos: { id: string }[];
  pending?: boolean;
};

export function overlayListItems(items: ListItemView[], outbox: OutboxItem[], listId: string): ListItemView[] {
  let result = items.map((i) => ({ ...i }));
  for (const o of outbox) {
    if (o.error || o.meta.listId !== listId) continue;
    const { op, itemId, data } = o.meta;
    if (op === "list-item-add" && itemId && !result.some((i) => i.id === itemId)) {
      result.push({
        id: itemId,
        title: String(data?.title ?? ""),
        quantity: (data?.quantity as string | null) ?? null,
        price: (data?.price as number | null) ?? null,
        status: (data?.status as ListItemView["status"]) ?? "pending",
        checked: false,
        notes: null,
        photos: [],
        pending: true,
      });
    } else if (op === "list-item-update" && itemId) {
      result = result.map((i) => (i.id === itemId ? { ...i, ...(data as Partial<ListItemView>), pending: true } : i));
    } else if (op === "list-item-delete" && itemId) {
      result = result.filter((i) => i.id !== itemId);
    } else if (op === "list-clear") {
      result = result.filter((i) => !i.checked);
    }
  }
  return result;
}

export type TaskView = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null; // YYYY-MM-DD
  repeatRule: string | null;
  assignedTo: string | null;
  pending?: boolean;
};

const today = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export function overlayTasks(tasks: TaskView[], outbox: OutboxItem[], now = new Date()): TaskView[] {
  let result = tasks.map((t) => ({ ...t }));
  for (const o of outbox) {
    if (o.error) continue;
    const { op, taskId, data } = o.meta;
    if (!taskId) continue;
    if (op === "task-add" && !result.some((t) => t.id === taskId)) {
      result.push({
        id: taskId,
        title: String(data?.title ?? ""),
        notes: null,
        dueAt: (data?.dueAt as string | null) ?? null,
        repeatRule: (data?.repeatRule as string | null) ?? null,
        assignedTo: (data?.assignedTo as string | null) ?? null,
        pending: true,
      });
    } else if (op === "task-complete") {
      const t = result.find((x) => x.id === taskId);
      const m = t?.repeatRule?.match(/^(\d+):(day|week|month|year)$/);
      if (t && m) {
        t.dueAt = addInterval(today(now), Number(m[1]), m[2] as "day" | "week" | "month" | "year").toISOString().slice(0, 10);
        t.pending = true;
      } else {
        result = result.filter((x) => x.id !== taskId);
      }
    } else if (op === "task-delete") {
      result = result.filter((t) => t.id !== taskId);
    }
  }
  return result;
}
