import { expect, test } from "@playwright/test";
import { goOffline, goOnline, newUser, png } from "./helpers";

test("caja con contenido y foto, etiqueta QR, aislamiento y cambios sin conexión", async ({ browser }) => {
  const a = await newUser(browser, "boxa", "Casa A");
  const b = await newUser(browser, "boxb", "Casa B");
  const { page, context } = a;

  await page.goto("/boxes/new");
  await page.getByLabel("Nombre").fill("Navidad");
  await page.getByLabel("Ubicación").fill("Bodega");
  await page.getByRole("button", { name: "Crear caja" }).click();
  await page.waitForURL(/\/b\/[0-9a-f-]{36}/);
  const boxUrl = page.url();

  await expect(page.getByText("CAJA N.º 01")).toBeVisible();
  await page.getByPlaceholder("Ej. Taladro inalámbrico").fill("Luces LED");
  await page.getByLabel("Cantidad").fill("3");
  await page.getByLabel("Categoría").fill("Decoración");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.locator("#contenido").getByText("Luces LED")).toBeVisible();
  await expect(page.locator("#contenido").getByText("×3")).toBeVisible();
  await expect(page.locator("#contenido").getByText("Decoración")).toBeVisible();

  await page.setInputFiles("input[type=file][multiple]", { name: "foto.png", mimeType: "image/png", buffer: png() });
  await expect(page.locator('#fotos img[src*="/api/files/"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('img[src*="/api/files/"]').first()).toBeVisible(); // también es la portada

  // etiqueta con QR
  await page.getByRole("link", { name: "Imprimir etiqueta" }).click();
  await expect(page.getByRole("heading", { name: "Etiquetas QR" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Etiquetas QR: Navidad" })).toBeVisible();
  await page.getByLabel("Tamaño de la etiqueta").selectOption("62x29");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar imagen" }).click()]);
  expect(dl.suggestedFilename()).toBe("etiqueta-navidad-62x29mm.png");

  // otro hogar no ve la caja ni su foto
  await b.page.goto(boxUrl);
  await expect(b.page.getByText("no tienes acceso")).toBeVisible();
  const photoSrc = await page.goto(boxUrl).then(() => page.locator('img[src*="/api/files/"]').first().getAttribute("src"));
  expect(await b.page.evaluate(async (u) => (await fetch(u!)).status, photoSrc)).toBe(404);

  // la lista muestra número, ubicación y cantidad de objetos
  await page.goto("/boxes");
  await expect(page.getByText("N.º 01")).toBeVisible();
  await expect(page.getByRole("link", { name: /Navidad/ })).toContainText("Bodega");
  await expect(page.getByText("1 caja · 3 objetos")).toBeVisible();
  await page.getByRole("link", { name: "Bodega · 1" }).click();
  await expect(page.getByRole("link", { name: /Navidad/ })).toBeVisible();
  await page.goto(boxUrl);

  // sin conexión: el elemento se ve como pendiente y se sincroniza al volver
  await page.reload();
  await page.waitForTimeout(500);
  await goOffline(context, page);
  await page.getByPlaceholder("Ej. Taladro inalámbrico").fill("Adornos");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.locator("#contenido").getByText("Adornos")).toBeVisible();
  await expect(page.getByText("1 cambio pendiente de enviar")).toBeVisible();
  await goOnline(context, page);
  await expect(page.getByText("cambio pendiente de enviar")).toHaveCount(0, { timeout: 20_000 });
  await page.reload();
  await expect(page.locator("#contenido").getByText("Adornos")).toBeVisible();
  await expect(page.getByText("Pendiente")).toHaveCount(0);

  await a.context.close();
  await b.context.close();
});

test("la búsqueda encuentra una caja por su contenido", async ({ browser }) => {
  const { page, context } = await newUser(browser, "boxsearch");
  await page.goto("/boxes/new");
  await page.getByLabel("Nombre").fill("Garaje");
  await page.getByRole("button", { name: "Crear caja" }).click();
  await page.waitForURL(/\/b\//);
  await page.getByPlaceholder("Ej. Taladro inalámbrico").fill("Taladro inalámbrico");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.locator("#contenido").getByText("Taladro inalámbrico")).toBeVisible();

  await page.goto("/boxes?q=taladro");
  await expect(page.getByRole("link", { name: /Garaje/ })).toBeVisible();
  await page.goto("/search?q=taladro");
  await expect(page.getByRole("heading", { name: "Cajas" })).toBeVisible();
  await context.close();
});
