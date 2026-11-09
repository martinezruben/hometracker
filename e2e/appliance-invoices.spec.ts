import { expect, test } from "@playwright/test";
import { newUser, png, validPdf } from "./helpers";

test("facturas del equipo: varias (PDF y foto), visor con zoom, borrado y aislamiento por hogar", async ({ browser }) => {
  const a = await newUser(browser, "facta", "Casa Facturas");
  const b = await newUser(browser, "factb", "Casa Ajena");
  const { page } = a;

  await page.goto("/appliances/new");
  await page.getByPlaceholder("Aire acondicionado de la sala").fill("Nevera");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await page.waitForURL(/\/appliances\/[0-9a-f-]{36}/);
  const url = page.url();

  const section = page.locator("#facturas");
  await expect(section.getByText("Aún no hay facturas")).toBeVisible();

  // Dos archivos de una vez: un PDF y una foto.
  await section.locator("input[type=file][multiple]").setInputFiles([
    { name: "factura.pdf", mimeType: "application/pdf", buffer: validPdf() },
    { name: "factura.png", mimeType: "image/png", buffer: png() },
  ]);
  await expect(section.getByText("2 facturas")).toBeVisible({ timeout: 15_000 });
  await expect(section.getByRole("button", { name: "Ver factura 1" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Ver factura 2" })).toBeVisible();

  // Visor de la foto: zoom con botones y cierre con Escape.
  const photo = section.getByRole("button", { name: /Ver factura/ }).filter({ hasText: "Foto" });
  await photo.click();
  const viewer = page.getByTestId("file-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Restablecer zoom" })).toHaveText("100%");
  await viewer.getByRole("button", { name: "Acercar" }).click();
  await expect(viewer.getByRole("button", { name: "Restablecer zoom" })).toHaveText("150%");
  await viewer.getByRole("button", { name: "Restablecer zoom" }).click();
  await expect(viewer.getByRole("button", { name: "Restablecer zoom" })).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);

  // Visor del PDF: se dibuja la página y el zoom agranda el lienzo.
  await section.getByRole("button", { name: /Ver factura/ }).filter({ hasText: "PDF" }).click();
  const canvas = viewer.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  const w1 = (await canvas.boundingBox())!.width;
  await viewer.getByRole("button", { name: "Acercar" }).click();
  await expect.poll(async () => (await canvas.boundingBox())!.width, { timeout: 10_000 }).toBeGreaterThan(w1 * 1.2);
  await viewer.getByRole("button", { name: "Cerrar" }).click();
  await expect(viewer).toHaveCount(0);

  // Otro hogar no ve ni descarga la factura.
  const id = (await section.getByRole("button", { name: /Ver factura/ }).first().locator("img").getAttribute("src")) ?? "";
  const img = await page.request.get(id.startsWith("/api") ? id : (await photo.locator("img").getAttribute("src"))!);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/");
  const foreign = await b.context.request.get((await photo.locator("img").getAttribute("src"))!);
  expect(foreign.status()).toBe(404);
  await b.page.goto(url);
  await expect(b.page.getByText("no tienes acceso")).toBeVisible();

  // Archivo no permitido y borrado.
  const bad = await page.request.post(`/api/appliances/${url.split("/appliances/")[1]}/invoices`, {
    multipart: { file: { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hola") } },
  });
  expect(bad.status()).toBe(400);
  page.once("dialog", (d) => void d.accept());
  await section.getByRole("button", { name: "Eliminar factura 2" }).click();
  await expect(section.getByText("1 factura", { exact: true })).toBeVisible({ timeout: 10_000 });

  await a.context.close();
  await b.context.close();
});

test("si pdf.js no carga, el visor muestra el PDF con el visor del navegador", async ({ browser }) => {
  const a = await newUser(browser, "factfb", "Casa Respaldo");
  const { page } = a;
  await page.goto("/appliances/new");
  await page.getByPlaceholder("Aire acondicionado de la sala").fill("Horno");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await page.waitForURL(/\/appliances\/[0-9a-f-]{36}/);
  const section = page.locator("#facturas");
  await section.locator("input[type=file][multiple]").setInputFiles({ name: "f.pdf", mimeType: "application/pdf", buffer: validPdf() });
  await expect(section.getByText("1 factura", { exact: true })).toBeVisible({ timeout: 15_000 });

  // pdf.js descarga el archivo con fetch: se lo negamos; el iframe (documento) sí puede cargarlo.
  await page.route("**/api/appliance-invoices/*", (r) => (r.request().resourceType() === "fetch" ? r.abort() : r.continue()));
  await section.getByRole("button", { name: "Ver factura 1" }).click();
  await expect(page.getByTestId("file-viewer").locator("iframe")).toBeVisible({ timeout: 15_000 });
  await a.context.close();
});
