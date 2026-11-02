import { expect, test } from "@playwright/test";
import { api, goOffline, goOnline, newId, newUser } from "./helpers";

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
  await expect(page.getByText(/· 45,50.* · Próximo:/)).toBeVisible(); // historial con el costo
  await expect(page.getByRole("definition").filter({ hasText: "45,50" })).toBeVisible(); // y en la cifra de gastado

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
  await expect(page.getByRole("img", { name: /^Etiquetas QR: / })).toBeVisible();
  await page.goto("/more");
  await page.getByRole("link", { name: /Etiquetas QR/ }).click();
  await expect(page.getByRole("heading", { name: "Equipos" })).toBeVisible();
  await page.getByLabel("Tamaño de la etiqueta").selectOption("a4");
  await expect(page.getByRole("button", { name: "Descargar hoja" }).first()).toBeVisible();

  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`/e/${id}`);
  await expect(ap).toHaveURL(new RegExp(`/login\\?next=%2Fe%2F${id}`));
  await page.goto(`/e/${id}`);
  await expect(page).toHaveURL(new RegExp(`/appliances/${id}`));
  await anon.close();
  await context.close();
});

test("Equipos: resumen por estado, tarjetas de mantenimiento con intervalo y calendario", async ({ browser }) => {
  const { page, context } = await newUser(browser, "equipos");
  const d = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const make = async (name: string, title: string, value: number, unit: string, offset: number) => {
    const id = newId();
    await api(page, "POST", "/api/appliances", { id, name, location: "Sala" });
    await api(page, "POST", `/api/appliances/${id}/plans`, { title, intervalValue: value, intervalUnit: unit, nextDue: d(offset) });
  };
  await make("Calentador", "Revisión anual", 1, "year", -12);
  await make("Aire", "Limpiar filtros", 3, "month", 2);
  await make("Nevera", "Filtro de agua", 6, "month", 80);

  await page.goto("/appliances");
  await expect(page.getByText("3 equipos · 2 requieren atención")).toBeVisible();
  const stats = page.getByRole("list", { name: "Resumen" });
  await expect(stats.getByRole("listitem").nth(0)).toContainText("Vencidos");
  await expect(stats.getByRole("listitem").nth(0)).toContainText("1");
  await expect(stats.getByRole("listitem").nth(1)).toContainText("1"); // pronto: el aire
  await expect(stats.getByRole("listitem").nth(2)).toContainText("1"); // al día: la nevera

  const cards = page.getByRole("link").filter({ hasText: "cada" });
  await expect(cards.first()).toContainText("Calentador");
  await expect(cards.first()).toContainText("Vencido");
  await expect(cards.first()).toContainText("cada año");
  await expect(page.getByRole("link", { name: /Aire/ }).first()).toContainText("cada 3 meses");

  // semana con punto de evento y calendario con el día seleccionable
  await expect(page.getByRole("list", { name: "Semana" }).getByRole("listitem")).toHaveCount(7);
  await page.getByRole("link", { name: "Calendario" }).click();
  await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();
  const aireDay = d(2);
  await page.goto(`/calendar?d=${aireDay}`);
  await expect(page.getByText("Limpiar filtros")).toBeVisible();
  await page.goto(`/calendar?d=${d(30)}`);
  await expect(page.getByText("Nada programado este día.")).toBeVisible();
  await context.close();
});
