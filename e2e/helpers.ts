import fs from "node:fs";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { MAIL_FILE } from "../playwright.config";

/** Último código de acceso enviado a `email` (el SMTP de prueba guarda los correos en un archivo). */
export async function otpFor(email: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const mails = fs.readFileSync(MAIL_FILE, "utf8").split("\n=====\n");
    const mail = [...mails].reverse().find((m) => m.toLowerCase().includes(`to: ${email.toLowerCase()}`));
    const code = mail?.match(/HomeTracker es (\d{6})/)?.[1];
    if (code) return code;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No llegó el código para ${email}`);
}

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;

/** Inicia sesión con código OTP. Deja la página en `/onboarding` (usuario nuevo) o en `/`. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  const code = await otpFor(email);
  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Crea un usuario nuevo con su hogar y lo deja en Inicio. */
export async function signUp(page: Page, tag: string, household = "Casa de prueba") {
  const email = uniqueEmail(tag);
  await login(page, email);
  await page.waitForURL("**/onboarding**");
  await page.getByLabel("Nombre del hogar").fill(household);
  await page.getByRole("button", { name: "Crear hogar" }).click();
  await expect(page).toHaveURL("/");
  return email;
}

export async function newUser(browser: Browser, tag: string, household?: string) {
  const context: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const email = await signUp(page, tag, household);
  return { context, page, email };
}

/** Llama a la API como el usuario de la página (para preparar datos). */
export async function api<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => null) };
    },
    { method, url, body },
  );
}

export const newId = () => crypto.randomUUID();

/** Simula perder la conexión (también avisa a la app, que escucha el evento `offline`). */
export async function goOffline(context: BrowserContext, page: Page) {
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
}
export async function goOnline(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
}

export const pdf = () => Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
export const png = () =>
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Mensaje de error de la app (excluye el anunciador de rutas de Next, que también es role="alert"). */
export const alertBox = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
