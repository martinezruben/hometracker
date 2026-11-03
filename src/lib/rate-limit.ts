import { RateLimitError } from "@/lib/auth/roles";

const hits = new Map<string, number[]>();

/**
 * Límite de ventana deslizante en memoria (por proceso): sirve para frenar abusos y gasto accidental.
 * No sustituye al tope mensual por hogar (que irá en base de datos).
 */
export function consume(key: string, limit: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    throw new RateLimitError();
  }
  recent.push(now);
  hits.set(key, recent);
  // evita que el mapa crezca sin fin
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
}

export const resetRateLimits = () => hits.clear();
