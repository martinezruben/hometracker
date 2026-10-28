import { expect, test } from "@playwright/test";
import { goOffline, goOnline, newUser, png } from "./helpers";

test("lista del súper: marcar y agregar sin conexión, sincronizar y quitar marcados", async ({ browser }) => {
  const { page, context } = await newUser(browser, "super");
  await page.goto("/lists?tab=super");
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
  await page.goto("/lists?tab=venta");
  await page.getByRole("button", { name: "Nueva lista" }).click();
  await page.getByPlaceholder("Súper de la semana").fill("Para vender");
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

test("pendientes: grupos, recurrente vencida que se reprograma, urgente, pasos y hechos", async ({ browser }) => {
  const { page, context } = await newUser(browser, "tareas", "Casa tareas");
  await page.goto("/lists");
  await expect(page.getByText("Nada pendiente", { exact: false }).or(page.getByText("No hay pendientes"))).toBeVisible();

  async function add(title: string, opts: { date?: string; time?: string; category?: string; urgent?: boolean; repeat?: string } = {}) {
    await page.getByRole("button", { name: "Pendiente", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo pendiente" });
    await dialog.getByPlaceholder("¿Qué hay que hacer?").fill(title);
    if (opts.date) {
      await dialog.locator("input[type=date]").evaluate((el) => el.removeAttribute("min"));
      await dialog.getByLabel("Fecha (opcional)").fill(opts.date);
    }
    if (opts.time) await dialog.getByLabel("Hora (opcional)").fill(opts.time);
    if (opts.category) await dialog.getByLabel("Categoría (opcional)").fill(opts.category);
    if (opts.repeat) await dialog.getByLabel("Repetir").selectOption(opts.repeat);
    if (opts.urgent) await dialog.getByRole("switch", { name: "Urgente" }).click();
    await dialog.getByRole("button", { name: "Agregar pendiente" }).click();
    await expect(dialog).toHaveCount(0);
  }
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  await add("Llamar al técnico", { date: day(0), time: "18:00", category: "Equipos", urgent: true });
  await add("Sacar el reciclaje", { date: day(-1), repeat: "1:week" });
  await add("Sin fecha");
  await expect(page.getByRole("region", { name: "HOY" })).toBeVisible();

  const hoy = page.getByRole("region", { name: "HOY" });
  await expect(hoy.getByRole("listitem").first()).toContainText("Llamar al técnico"); // urgente primero
  await expect(hoy.getByRole("listitem").first()).toContainText("Urgente");
  await expect(hoy.getByRole("listitem").first()).toContainText("6:00 p. m. · Equipos");
  await expect(hoy.getByRole("listitem").nth(1)).toContainText("Cada semana");
  await expect(page.getByRole("region", { name: "SIN FECHA" })).toContainText("Sin fecha");
  await expect(page.getByText("2 pendientes · 2 son para hoy")).toBeVisible();

  // la recurrente se reprograma a la semana siguiente y sale de HOY
  await page.getByLabel("Sacar el reciclaje").click();
  await expect(hoy).not.toContainText("Sacar el reciclaje");
  // siete días después de hoy siempre cae después del domingo de esta semana
  await expect(page.getByRole("region", { name: "MÁS ADELANTE" })).toContainText("Sacar el reciclaje");

  // pasos
  await page.getByRole("button", { name: /Llamar al técnico/ }).click();
  await page.getByPlaceholder("Agregar un paso").fill("Buscar el número");
  await page.getByRole("button", { name: "Agregar paso" }).click();
  await expect(page.getByRole("checkbox", { name: "Buscar el número" })).toBeVisible();
  await page.getByPlaceholder("Agregar un paso").fill("Pedir presupuesto");
  await page.getByRole("button", { name: "Agregar paso" }).click();
  await page.getByRole("checkbox", { name: "Buscar el número" }).check();
  await page.reload();
  await expect(page.getByRole("button", { name: /Llamar al técnico/ })).toContainText("1 de 2 pasos");

  // completar una simple: queda en HOY como hecha, con quién la hizo, y el anillo avanza
  await page.getByLabel("Llamar al técnico").first().click();
  await expect(hoy.getByRole("button", { name: /Reabrir Llamar al técnico/ })).toBeVisible();
  await expect(hoy).toContainText("Hecho por");
  await expect(page.getByText("1/")).toBeVisible();

  // reabrir
  await hoy.getByRole("button", { name: /Reabrir Llamar al técnico/ }).click();
  await expect(hoy.getByLabel("Llamar al técnico")).toBeVisible();

  // eliminar
  await page.getByRole("button", { name: /Sin fecha/ }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Sin fecha", { exact: true })).toHaveCount(0);
  await context.close();
});
