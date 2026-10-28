// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { flushOutbox, HttpError, listOutbox, mutate } from "./outbox";

const req = (name: string) => ({
  url: "/api/boxes",
  method: "POST",
  body: { name },
  meta: { op: "box-create" as const, boxId: name, name },
});
const ok = () => new Response("{}", { status: 200 });

beforeEach(async () => {
  await getDb().outbox.clear();
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal("Event", class {});
});

describe("outbox", () => {
  it("envía directo cuando hay red", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    expect(await mutate(req("a"), f)).toEqual({ queued: false });
    expect(f).toHaveBeenCalledTimes(1);
    expect(await listOutbox()).toHaveLength(0);
  });

  it("encola si no hay conexión y respeta el orden al reconectar", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("navigator", { onLine: false });
    await mutate(req("a"), f);
    await mutate(req("b"), f);
    expect(f).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { onLine: true });
    expect(await flushOutbox(f)).toBe(2);
    expect(f.mock.calls.map((c) => JSON.parse(c[1].body).name)).toEqual(["a", "b"]);
    expect(await listOutbox()).toHaveLength(0);
  });

  it("encola tras un error de red y si el servidor responde 5xx", async () => {
    await mutate(req("a"), vi.fn().mockRejectedValue(new TypeError("fail")));
    expect(await listOutbox()).toHaveLength(1);
    await getDb().outbox.clear();
    await mutate(req("b"), vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    expect(await listOutbox()).toHaveLength(1);
  });

  it("lanza HttpError ante 4xx y no encola", async () => {
    await expect(mutate(req("a"), vi.fn().mockResolvedValue(new Response("", { status: 400 })))).rejects.toBeInstanceOf(HttpError);
    expect(await listOutbox()).toHaveLength(0);
  });

  it("si ya hay cambios en cola, los nuevos van detrás", async () => {
    await mutate(req("a"), vi.fn().mockRejectedValue(new TypeError("fail")));
    const f = vi.fn().mockResolvedValue(ok());
    expect(await mutate(req("b"), f)).toEqual({ queued: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("al vaciar: se detiene en fallos recuperables y marca los rechazados", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    for (const n of ["a", "b", "c"]) await mutate(req(n), vi.fn());
    vi.stubGlobal("navigator", { onLine: true });
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 400 })) // a: rechazado
      .mockResolvedValueOnce(new Response("", { status: 503 })); // b: servidor caído → pausa
    expect(await flushOutbox(f)).toBe(0);
    const rest = await listOutbox();
    expect(rest.map((i) => i.meta.boxId)).toEqual(["a", "b", "c"]);
    expect(rest[0].error).toBe("HTTP 400");
    expect(rest[1].attempts).toBe(1);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("un DELETE que devuelve 404 se da por hecho", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await mutate({ url: "/api/box-items/x", method: "DELETE", meta: { op: "item-delete", itemId: "x" } }, vi.fn());
    vi.stubGlobal("navigator", { onLine: true });
    expect(await flushOutbox(vi.fn().mockResolvedValue(new Response("", { status: 404 })))).toBe(1);
  });
});
