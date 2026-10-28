import { expect, test } from "@playwright/test";
import { alertBox, login, newUser, otpFor, signUp, uniqueEmail } from "./helpers";

test("código incorrecto no entra y el correcto sí; cerrar sesión protege las páginas", async ({ page }) => {
  const email = uniqueEmail("auth");
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  const code = await otpFor(email);
  const wrong = code === "000000" ? "111111" : "000000";

  await page.getByLabel("Código de 6 dígitos").fill(wrong);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(alertBox(page)).toHaveText("Código inválido o vencido.");

  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/onboarding**");
  await page.getByLabel("Nombre del hogar").fill("Casa Auth");
  await page.getByRole("button", { name: "Crear hogar" }).click();
  await expect(page.getByText("SALUD DEL HOGAR")).toBeVisible();

  await page.goto("/more");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/boxes");
  await expect(page).toHaveURL(/\/login/);
});

test("una invitación suma a otra persona al hogar, una sola vez y con el rol elegido", async ({ browser }) => {
  const owner = await newUser(browser, "owner", "Casa Compartida");
  await owner.page.goto("/more");
  await owner.page.getByLabel("Rol").selectOption("viewer");
  await owner.page.getByRole("button", { name: "Generar enlace" }).click();
  const link = await owner.page.locator("input[readonly]").inputValue();
  expect(link).toMatch(/\/join\/.+/);

  const guest = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const gp = await guest.newPage();
  await gp.goto(link); // sin sesión: pide login y regresa a la invitación
  await expect(gp).toHaveURL(/\/login\?next=%2Fjoin%2F/);
  const guestEmail = uniqueEmail("guest");
  await gp.getByLabel("Correo electrónico").fill(guestEmail);
  await gp.getByRole("button", { name: "Enviar código" }).click();
  await gp.getByLabel("Código de 6 dígitos").fill(await otpFor(guestEmail));
  await gp.getByRole("button", { name: "Entrar" }).click();
  await expect(gp.getByRole("heading", { name: "Unirte al hogar" })).toBeVisible(); // sin pasar por "Crea tu hogar"
  await gp.getByRole("button", { name: "Aceptar invitación" }).click();
  await expect(gp.getByText("Casa Compartida")).toBeVisible();

  // rol "solo lectura": no puede crear cajas
  await gp.goto("/boxes");
  await expect(gp.getByRole("link", { name: "Nueva caja" })).toHaveCount(0);

  // el enlace ya se usó
  const third = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const tp = await third.newPage();
  await login(tp, uniqueEmail("third"));
  await tp.goto(link);
  await tp.getByRole("button", { name: "Aceptar invitación" }).click();
  await expect(alertBox(tp)).toHaveText("La invitación no es válida, venció o ya se usó.");

  await owner.context.close();
  await guest.close();
  await third.close();
});

test("el nombre se pide al crear el hogar y se usa en el saludo", async ({ page }) => {
  const email = uniqueEmail("nombre");
  await login(page, email);
  await page.waitForURL("**/onboarding**");
  await page.getByLabel("Tu nombre").fill("Rubén");
  await page.getByLabel("Nombre del hogar").fill("Casa Martínez");
  await page.getByRole("button", { name: "Crear hogar" }).click();
  await expect(page.getByRole("heading", { name: "Rubén" })).toBeVisible();
  await expect(page.getByText("SALUD DEL HOGAR")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Casa Martínez" })).toBeVisible();
});

test("recordatorios: interruptores por tipo que se guardan y persisten", async ({ page }) => {
  await signUp(page, "recordatorios");
  await page.goto("/reminders");
  await expect(page.getByRole("heading", { name: "Nunca olvides un mantenimiento" })).toBeVisible();
  const sw = (name: string) => page.getByRole("switch", { name });
  // valores por defecto: todo activo salvo el resumen semanal
  await expect(sw("Mantenimientos")).toBeChecked();
  await expect(sw("Garantías y pagos")).toBeChecked();
  await expect(sw("Mis pendientes")).toBeChecked();
  await expect(sw("Resumen semanal")).not.toBeChecked();

  await sw("Resumen semanal").click();
  await sw("Mis pendientes").click();
  await expect(sw("Resumen semanal")).toBeChecked();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(sw("Resumen semanal")).toBeChecked();
  await expect(sw("Mis pendientes")).not.toBeChecked();
  await expect(sw("Mantenimientos")).toBeChecked();

  // sin la app instalada o sin claves VAPID, el botón explica qué falta
  await expect(page.getByText("no están configuradas").or(page.getByRole("button", { name: "Activar recordatorios" }))).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect(page).toHaveURL("/");
});
