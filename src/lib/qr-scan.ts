const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** Extrae el id de caja de un QR (`https://dominio/b/<uuid>`); null si no es de HomeTracker. */
export function extractBoxId(text: string): string | null {
  const m = text.trim().match(new RegExp(`^https?://[^/\\s]+/b/(${UUID})/?$`));
  return m ? m[1].toLowerCase() : null;
}
