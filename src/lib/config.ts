// El dominio oficial aún no está definido: la URL base sale siempre de la variable de entorno.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const boxUrlBase = () => APP_URL.replace(/\/$/, "");
export const boxUrl = (id: string) => `${boxUrlBase()}/b/${id}`;
export const applianceUrl = (id: string) => `${boxUrlBase()}/e/${id}`;
