import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { api, newId, signUp, uniqueEmail } from "./helpers";

// Recorre las pantallas principales en modo claro y oscuro y exige cero violaciones de axe.
for (const scheme of ["light", "dark"] as const) {
  test(`accesibilidad (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: scheme });
    const page = await context.newPage();

    await page.goto("/login");
    expect((await new AxeBuilder({ page }).analyze()).violations, "/login").toEqual([]);
    await signUp(page, `a11y${scheme}`, "Casa a11y");
    void uniqueEmail;

    const box = newId(), app = newId(), plan = newId(), list = newId(), sale = newId(), doc = newId(), contact = newId(), exp = newId();
    await api(page, "POST", "/api/boxes", { id: box, name: "Navidad", location: "Bodega" });
    await api(page, "POST", `/api/boxes/${box}/items`, { title: "Luces" });
    await api(page, "POST", "/api/appliances", { id: app, name: "Aire sala", brand: "LG" });
    await api(page, "POST", `/api/appliances/${app}/plans`, { id: plan, title: "Filtros", intervalValue: 6, intervalUnit: "month", nextDue: "2026-01-01", remindDaysBefore: 7 });
    await api(page, "POST", "/api/lists", { id: list, name: "Súper", type: "shopping" });
    await api(page, "POST", `/api/lists/${list}/items`, { title: "Leche" });
    await api(page, "POST", "/api/lists", { id: sale, name: "Para vender", type: "sale" });
    await api(page, "POST", `/api/lists/${sale}/items`, { title: "Bicicleta", price: 120 });
    await api(page, "POST", "/api/tasks", { title: "Pagar luz", dueAt: "2026-12-01" });
    await api(page, "POST", "/api/contacts", { id: contact, name: "Pedro", category: "Plomero", phone: "555", rating: 4 });
    await api(page, "POST", "/api/documents", { id: doc, kind: "contract", title: "Seguro", expiresAt: "2027-01-01" });
    await api(page, "POST", "/api/expenses", { id: exp, title: "Luz", amount: 50, spentAt: new Date().toISOString().slice(0, 10), category: "Servicios" });

    const paths = [
      "/", "/boxes", "/boxes/new", `/b/${box}`, `/b/${box}/label`, "/appliances", "/appliances/new", `/appliances/${app}`,
      `/appliances/${app}/label`, "/lists", "/lists?tab=super", "/lists?tab=venta", `/lists/${list}`, `/lists/${sale}`, "/documents", "/documents/new",
      `/documents/${doc}`, "/contacts", "/contacts/new", `/contacts/${contact}`, "/expenses", "/expenses/new", `/expenses/${exp}`,
      "/more", "/search?q=lu", "/scan", "/upcoming", "/calendar", "/reminders",
    ];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`), path).toEqual([]);
    }
    await context.close();
  });
}
