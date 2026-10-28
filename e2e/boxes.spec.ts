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

  await page.getByPlaceholder("Ej. 3 cajas de luces").fill("Luces LED");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Luces LED")).toBeVisible();

  await page.setInputFiles("input[type=file][multiple]", { name: "foto.png", mimeType: "image/png", buffer: png() });
  await expect(page.locator('img[src*="/api/files/"]')).toHaveCount(1, { timeout: 15_000 });

  // etiqueta con QR
  await page.getByRole("link", { name: "Imprimir etiqueta" }).click();
  await expect(page.locator("svg").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Navidad" })).toBeVisible();

  // otro hogar no ve la caja ni su foto
  await b.page.goto(boxUrl);
  await expect(b.page.getByText("no tienes acceso")).toBeVisible();
  const photoSrc = await page.goto(boxUrl).then(() => page.locator('img[src*="/api/files/"]').getAttribute("src"));
  expect(await b.page.evaluate(async (u) => (await fetch(u!)).status, photoSrc)).toBe(404);

  // sin conexión: el elemento se ve como pendiente y se sincroniza al volver
  await page.reload();
  await page.waitForTimeout(500);
  await goOffline(context, page);
  await page.getByPlaceholder("Ej. 3 cajas de luces").fill("Adornos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Adornos")).toBeVisible();
  await expect(page.getByText("1 cambio pendiente de enviar")).toBeVisible();
  await goOnline(context, page);
  await expect(page.getByText("cambio pendiente de enviar")).toHaveCount(0, { timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Adornos")).toBeVisible();
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
  await page.getByPlaceholder("Ej. 3 cajas de luces").fill("Taladro inalámbrico");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Taladro inalámbrico")).toBeVisible();

  await page.goto("/boxes?q=taladro");
  await expect(page.getByRole("link", { name: /Garaje/ })).toBeVisible();
  await page.goto("/search?q=taladro");
  await expect(page.getByRole("heading", { name: "Cajas" })).toBeVisible();
  await context.close();
});
