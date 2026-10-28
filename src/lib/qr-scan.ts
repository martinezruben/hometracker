const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export type ScanTarget = { kind: "box" | "appliance"; id: string };

/** Interpreta un QR de HomeTracker (`https://dominio/b/<uuid>` o `/e/<uuid>`); null si es ajeno. */
export function extractTarget(text: string): ScanTarget | null {
  const m = text.trim().match(new RegExp(`^https?://[^/\\s]+/(b|e)/(${UUID})/?$`));
  return m ? { kind: m[1] === "b" ? "box" : "appliance", id: m[2].toLowerCase() } : null;
}

export const targetPath = (t: ScanTarget) => (t.kind === "box" ? `/b/${t.id}` : `/appliances/${t.id}`);
