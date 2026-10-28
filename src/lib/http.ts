import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/roles";
import { RateLimitError } from "@/lib/auth/otp";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Traduce errores conocidos a respuestas HTTP sin filtrar detalles internos. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) return json({ error: "invalid_input" }, 400);
  if (err instanceof UnauthorizedError) return json({ error: "unauthorized" }, 401);
  if (err instanceof ForbiddenError) return json({ error: "forbidden" }, 403);
  if (err instanceof RateLimitError) return json({ error: "rate_limited" }, 429);
  console.error(err);
  return json({ error: "server_error" }, 500);
}
