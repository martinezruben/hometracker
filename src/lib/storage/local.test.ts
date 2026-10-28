import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { localStorageDriver, safeKey } = await import("./index");

describe("almacenamiento local", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ht-storage-"));
  afterAll(() => rm(dir, { recursive: true, force: true }));
  const storage = localStorageDriver(dir);

  it("guarda, lee y borra archivos", async () => {
    await storage.put("hh/abc.jpg", Buffer.from("hola"), "image/jpeg");
    const got = await storage.get("hh/abc.jpg");
    expect(got).not.toBeNull();
    expect(await new Response(got!.body).text()).toBe("hola");
    await storage.remove("hh/abc.jpg");
    expect(await storage.get("hh/abc.jpg")).toBeNull();
  });

  it("rechaza llaves que escapan del directorio", () => {
    expect(() => safeKey("../etc/passwd")).toThrow();
    expect(() => safeKey("/abs/path")).toThrow();
    expect(() => safeKey("a/../../b")).toThrow();
    expect(safeKey("hh/abc_t.jpg")).toBe("hh/abc_t.jpg");
  });
});
