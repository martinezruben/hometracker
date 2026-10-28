import { expect, test } from "@playwright/test";
import { goOffline, goOnline, newUser, png } from "./helpers";

test("lista del súper: marcar y agregar sin conexión, sincronizar y quitar marcados", async ({ browser }) => {
  const { page, context } = await newUser(browser, "super");
  await page.goto("/lists");
  await page.getByRole("button", { name: "Nueva lista" }).click();
  await page.getByPlaceholder("Súper de la semana").fill("Súper semana");
  await page.getByRole("button", { name: "Crear lista" }).click();
  await page.waitForURL(/\/lists\/[0-9a-f-]{36}/);

  for (const x of ["Leche", "Pan"]) {
    await page.getByPlaceholder("Agregar elemento").fill(x);
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText(x, { exact: true })).toBeVisible();
  }
  await page.goto(page.url()); // navegación completa: queda disponible sin conexión
  await page.waitForTimeout(800);

  await goOffline(context, page);
  await page.getByLabel("Leche").check();
  await page.getByPlaceholder("Agregar elemento").fill("Huevos");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Huevos")).toBeVisible();
  await expect(page.getByText("cambios pendientes de enviar")).toBeVisible();
  await goOnline(context, page);
  await expect(page.getByText("cambios pendientes de enviar")).toHaveCount(0, { timeout: 20_000 });
  await page.reload();
  await expect(page.getByLabel("Leche")).toBeChecked();

  await page.getByRole("button", { name: "Quitar marcados" }).click();
  await expect(page.getByText("Leche")).toHaveCount(0);
  await expect(page.getByText("Huevos")).toBeVisible();
  await context.close();
});

test("lista para vender: precio, foto y marcar vendido", async ({ browser }) => {
  const { page, context } = await newUser(browser, "venta");
  await page.goto("/lists");
  await page.getByRole("button", { name: "Nueva lista" }).click();
  await page.getByPlaceholder("Súper de la semana").fill("Para vender");
  await page.getByLabel("Tipo").selectOption("sale");
  await page.getByRole("button", { name: "Crear lista" }).click();
  await page.waitForURL(/\/lists\/[0-9a-f-]{36}/);

  await page.getByPlaceholder("Agregar elemento").fill("Bicicleta");
  await page.getByPlaceholder("Precio").fill("120");
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: /Bicicleta/ }).click();
  await page.setInputFiles("input[type=file][multiple]", { name: "bici.png", mimeType: "image/png", buffer: png() });
  await expect(page.locator('img[src*="/api/files/"]')).toHaveCount(1, { timeout: 15_000 });
  await page.getByRole("button", { name: "Marcar vendido" }).click();
  await expect(page.getByText(/Vendido/)).toBeVisible();
  await context.close();
});

test("pendientes: una tarea recurrente vencida se reprograma y una simple pasa a hechos", async ({ browser }) => {
  const { page, context } = await newUser(browser, "tareas");
  await page.goto("/tasks");

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.getByPlaceholder("¿Qué hay que hacer?").fill("Sacar basura");
  await page.getByLabel("Repetir").selectOption("1:week");
  await page.locator("input[type=date]").evaluate((el) => el.removeAttribute("min"));
  await page.getByLabel("Fecha (opcional)").fill(yesterday);
  await page.getByRole("button", { name: "Agregar pendiente" }).click();
  await expect(page.getByText("Vencido hace 1 día")).toBeVisible();

  await page.getByPlaceholder("¿Qué hay que hacer?").fill("Pagar luz");
  await page.getByRole("button", { name: "Agregar pendiente" }).click();
  await expect(page.getByText("Pagar luz")).toBeVisible();

  await page.getByLabel("Sacar basura").click();
  await expect(page.getByText("Vencido hace 1 día")).toHaveCount(0);
  await page.getByLabel("Pagar luz").click();
  await expect(page.getByLabel("Pagar luz")).toHaveCount(0); // esperar a que el servidor lo complete antes de recargar
  await page.reload();
  await expect(page.getByLabel("Sacar basura")).toHaveCount(1);
  await expect(page.getByLabel("Pagar luz")).toHaveCount(0);
  await expect(page.locator("details", { hasText: "Pagar luz" })).toHaveCount(1);
  await context.close();
});
