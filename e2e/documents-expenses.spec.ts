import { expect, test } from "@playwright/test";
import { alertBox, goOffline, goOnline, newUser, pdf } from "./helpers";

test("contacto, documento con PDF y vencimiento, y privacidad entre hogares", async ({ browser }) => {
  const a = await newUser(browser, "doca", "Casa A");
  const b = await newUser(browser, "docb", "Casa B");
  const { page } = a;

  await page.goto("/contacts/new");
  await page.getByLabel("Nombre").fill("Pedro Plomero");
  await page.getByLabel("Oficio o categoría").fill("Plomero");
  await page.getByLabel("Teléfono").fill("+52 55 1234 5678");
  await page.getByRole("button", { name: "Crear contacto" }).click();
  await page.waitForURL(/\/contacts\/[0-9a-f-]{36}/);
  await expect(page.getByRole("link", { name: "Llamar" })).toHaveAttribute("href", "tel:+525512345678");
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/525512345678");

  const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  await page.goto("/documents/new");
  await page.getByLabel("Tipo").selectOption("contract");
  await page.getByLabel("Título").fill("Seguro del hogar");
  await page.getByLabel("Vence (opcional)").fill(inTenDays);
  await page.getByLabel("Monto (opcional)").fill("350.50");
  await page.getByLabel("Proveedor").selectOption({ label: "Pedro Plomero" });
  await page.setInputFiles("input[type=file]", { name: "contrato.pdf", mimeType: "application/pdf", buffer: pdf() });
  await page.getByRole("button", { name: "Guardar documento" }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}/);
  await expect(page.getByRole("link", { name: "Ver archivo" })).toBeVisible();
  await expect(page.getByText("Vence en 10 días").first()).toBeVisible();
  const docUrl = page.url();

  const fileUrl = `/api/documents/${docUrl.split("/documents/")[1]}/file`;
  const own = await page.evaluate(async (u) => { const r = await fetch(u); return [r.status, r.headers.get("content-type")]; }, fileUrl);
  expect(own).toEqual([200, "application/pdf"]);
  expect(await b.page.evaluate(async (u) => (await fetch(u)).status, fileUrl)).toBe(404);
  await b.page.goto(docUrl);
  await expect(b.page.getByText("no tienes acceso")).toBeVisible();

  // archivo demasiado grande
  await page.goto(docUrl);
  await page.setInputFiles("input[type=file][hidden]", {
    name: "grande.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.concat([pdf(), Buffer.alloc(5 * 1024 * 1024)]),
  });
  await expect(alertBox(page)).toContainText("pesa más de 4 MB");

  await a.context.close();
  await b.context.close();
});

test("gastos: resumen por categoría, recibo, meses y creación sin conexión", async ({ browser }) => {
  const a = await newUser(browser, "gasa", "Casa A");
  const b = await newUser(browser, "gasb", "Casa B");
  const { page, context } = a;

  async function add(title: string, amount: string, category: string, receipt = false) {
    await page.goto("/expenses/new");
    await page.getByLabel("¿En qué?").fill(title);
    await page.getByLabel("Monto").fill(amount);
    await page.getByLabel("Categoría").selectOption(category);
    if (receipt) await page.setInputFiles("input[type=file]", { name: "recibo.pdf", mimeType: "application/pdf", buffer: pdf() });
    await page.getByRole("button", { name: "Guardar gasto" }).click();
    await page.waitForURL(/\/expenses\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    return page.url();
  }
  const luz = await add("Recibo de luz", "80.25", "Servicios", true);
  await expect(page.getByRole("link", { name: "Ver recibo" })).toBeVisible();
  await add("Plomero", "150", "Reparaciones");
  await add("Agua", "20", "Servicios");

  await page.goto("/expenses");
  await expect(page.locator("p.text-3xl")).toHaveText(/250,25/);
  const cats = page.getByRole("list", { name: "Por categoría" }).getByRole("listitem");
  await expect(cats).toHaveCount(2);
  await expect(cats.first()).toContainText("Reparaciones");
  await expect(cats.nth(1)).toContainText("Servicios");

  await page.getByRole("link", { name: "Mes anterior" }).click();
  await expect(page.getByText("No hay gastos este mes.")).toBeVisible();
  await page.getByRole("link", { name: "Mes siguiente" }).click();
  await expect(page.getByText("Recibo de luz")).toBeVisible();

  const receiptUrl = `/api/expenses/${luz.split("/expenses/")[1]}/receipt`;
  expect(await b.page.evaluate(async (u) => (await fetch(u)).status, receiptUrl)).toBe(404);

  // sin conexión
  await page.goto("/expenses/new");
  await page.waitForTimeout(500);
  await goOffline(context, page);
  await page.getByLabel("¿En qué?").fill("Gasto sin red");
  await page.getByLabel("Monto").fill("12");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await page.waitForURL("**/expenses");
  await expect(page.getByText("Se guardará al reconectar")).toBeVisible();
  await goOnline(context, page);
  await expect(page.getByText("Se guardará al reconectar")).toHaveCount(0, { timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Gasto sin red")).toBeVisible();

  await a.context.close();
  await b.context.close();
});

test("exportación de datos solo para administradores", async ({ browser }) => {
  const { page, context } = await newUser(browser, "export", "Casa Export");
  await page.goto("/boxes/new");
  await page.getByLabel("Nombre").fill("Caja exportable");
  await page.getByRole("button", { name: "Crear caja" }).click();
  await page.waitForURL(/\/b\//);

  await page.goto("/more");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar mis datos" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^hometracker-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await (await import("node:fs/promises")).readFile((await download.path())!, "utf8"));
  expect(data.household.name).toBe("Casa Export");
  expect(data.boxes.map((x: { name: string }) => x.name)).toEqual(["Caja exportable"]);
  await context.close();
});
