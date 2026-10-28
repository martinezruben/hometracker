/** Solo rutas internas, para evitar redirecciones abiertas. */
export const safeNext = (value: string | null | undefined) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
