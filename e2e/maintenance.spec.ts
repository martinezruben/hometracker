import { expect, test } from "@playwright/test";
import { goOffline, goOnline, newUser } from "./helpers";

test("equipo con plan vencido: aparece en Inicio, se completa con costo y se reprograma; sin conexión queda pendiente", async ({ browser }) => {
  const { page, context } = await newUser(browser, "maint");

  await page.goto("/appliances/new");
  await page.getByPlaceholder("Aire acondicionado de la sala").fill("Aire sala");
  await page.getByLabel("Marca").fill("LG");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await page.waitForURL(/\/appliances\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: "Programar mantenimiento" }).click();
  await page.getByPlaceholder("Limpiar filtros").fill("Limpiar filtros");
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Primera fecha").fill(threeDaysAgo);
  await page.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByText("Vencido hace 3 días")).toBeVisible();

  await page.goto("/");
  const row = page.getByRole("link", { name: /Limpiar filtros/ });
  await expect(row).toContainText("Vencido");
  await expect(row).toContainText("Hace 3 días");

  await page.goBack();
  await page.getByRole("button", { name: "Marcar como hecho" }).click();
  await page.getByLabel("Costo (opcional)").fill("45.50");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Vence en 182 días").or(page.getByText("Vence en 181 días"))).toBeVisible();
  await expect(page.getByText(/45,50/)).toBeVisible(); // historial con el costo

  // sin conexión
  await page.reload();
  await page.waitForTimeout(500);
  await goOffline(context, page);
  await page.getByRole("button", { name: "Marcar como hecho" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("1 cambio pendiente de enviar")).toBeVisible();
  await goOnline(context, page);
  await expect(page.getByText("cambio pendiente de enviar")).toHaveCount(0, { timeout: 20_000 });
  await context.close();
});

test("QR del equipo: pide login y vuelve al equipo", async ({ browser }) => {
  const { page, context } = await newUser(browser, "maintqr");
  await page.goto("/appliances/new");
  await page.getByPlaceholder("Aire acondicionado de la sala").fill("Nevera");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await page.waitForURL(/\/appliances\/[0-9a-f-]{36}/);
  const id = page.url().split("/appliances/")[1];

  await page.getByRole("link", { name: "Imprimir etiqueta QR" }).click();
  await expect(page.locator("svg").first()).toBeVisible();

  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`/e/${id}`);
  await expect(ap).toHaveURL(new RegExp(`/login\\?next=%2Fe%2F${id}`));
  await page.goto(`/e/${id}`);
  await expect(page).toHaveURL(new RegExp(`/appliances/${id}`));
  await anon.close();
  await context.close();
});
