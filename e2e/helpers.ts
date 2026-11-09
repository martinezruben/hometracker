import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;

export const TEST_PASSWORD = "clave-segura-123";

/** Crea una cuenta nueva (correo + contraseña). Deja la página en `/onboarding` o en la invitación. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: "¿No tienes cuenta? Crear una" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
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

/** PDF mínimo pero válido (una página con texto y tabla xref correcta) para probar el visor. */
export function validPdf(text = "Factura de prueba"): Buffer {
  const stream = `BT /F1 18 Tf 20 100 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}
