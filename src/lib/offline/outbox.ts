import { getDb, type OutboxItem, type OutboxMeta } from "./db";

export const OUTBOX_EVENT = "ht-outbox-changed";

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
  }
}

export type MutationRequest =
  | { kind?: "json"; url: string; method: string; body?: unknown; meta: OutboxMeta }
  | {
      kind: "photo";
      url: string;
      method: "POST";
      photo: { fields: Record<string, string>; file: Blob; thumb: Blob };
      meta: OutboxMeta;
    };

const notify = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_EVENT));
};

export const listOutbox = () => getDb().outbox.orderBy("seq").toArray();

function buildInit(item: Pick<OutboxItem, "kind" | "method" | "body" | "photo">): RequestInit {
  if (item.kind === "photo" && item.photo) {
    const form = new FormData();
    for (const [k, v] of Object.entries(item.photo.fields)) form.set(k, v);
    form.set("file", new File([item.photo.file], "foto.jpg", { type: "image/jpeg" }));
    form.set("thumb", new File([item.photo.thumb], "mini.jpg", { type: "image/jpeg" }));
    return { method: item.method, body: form };
  }
  return {
    method: item.method,
    headers: item.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
  };
}

async function enqueue(req: MutationRequest) {
  await getDb().outbox.add({
    kind: req.kind ?? "json",
    url: req.url,
    method: req.method,
    body: "body" in req ? req.body : undefined,
    photo: "photo" in req ? req.photo : undefined,
    meta: req.meta,
    createdAt: Date.now(),
    attempts: 0,
  });
  notify();
}

/**
 * Envía un cambio. Si no hay red, el servidor falla (5xx) o ya hay cambios en cola
 * (para respetar el orden), lo guarda y se enviará al reconectar.
 * Lanza HttpError si el servidor lo rechaza (4xx): reintentar no serviría.
 */
export async function mutate(req: MutationRequest, fetchFn: typeof fetch = fetch) {
  const pending = (await getDb().outbox.filter((i) => !i.error).count()) > 0;
  if (pending || (typeof navigator !== "undefined" && !navigator.onLine)) {
    await enqueue(req);
    return { queued: true as const };
  }
  try {
    const res = await fetchFn(req.url, buildInit({ kind: req.kind ?? "json", method: req.method, body: "body" in req ? req.body : undefined, photo: "photo" in req ? req.photo : undefined }));
    if (res.ok) return { queued: false as const };
    if (res.status >= 500 || res.status === 408 || res.status === 429) {
      await enqueue(req);
      return { queued: true as const };
    }
    throw new HttpError(res.status);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    await enqueue(req); // error de red
    return { queued: true as const };
  }
}

let flushing = false;

/** Envía la cola en orden. Se detiene ante errores recuperables. Devuelve cuántos se enviaron. */
export async function flushOutbox(fetchFn: typeof fetch = fetch) {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const items = (await listOutbox()).filter((i) => !i.error);
    for (const item of items) {
      let res: Response;
      try {
        res = await fetchFn(item.url, buildInit(item));
      } catch {
        await getDb().outbox.update(item.seq!, { attempts: item.attempts + 1 });
        break; // sin red: reintentar luego
      }
      if (res.ok || (item.method === "DELETE" && res.status === 404)) {
        await getDb().outbox.delete(item.seq!);
        sent++;
        continue;
      }
      if (res.status === 401 || res.status >= 500 || res.status === 408 || res.status === 429) {
        await getDb().outbox.update(item.seq!, { attempts: item.attempts + 1 });
        break; // sesión vencida o servidor caído: reintentar luego
      }
      await getDb().outbox.update(item.seq!, { error: `HTTP ${res.status}` });
    }
  } finally {
    flushing = false;
    notify();
  }
  return sent;
}

export async function discardFailed() {
  await getDb().outbox.filter((i) => !!i.error).delete();
  notify();
}

/** Limpia todo (al cerrar sesión: no dejar datos de un usuario en el dispositivo). */
export async function clearOutbox() {
  await getDb().outbox.clear();
  notify();
}
