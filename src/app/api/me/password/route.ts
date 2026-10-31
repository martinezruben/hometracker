import { z } from "zod";
import { requireApiUser } from "@/lib/auth/access";
import { PASSWORD_MAX, PASSWORD_MIN, changePassword } from "@/lib/auth/password";
import { currentSessionId } from "@/lib/auth/session";
import { handleError, json } from "@/lib/http";

const body = z.object({
  current: z.string().min(1).max(PASSWORD_MAX),
  next: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

/** Cambia la contraseña de la persona; cierra sus otras sesiones. */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const { current, next } = body.parse(await request.json());
    const ok = await changePassword(user.id, user.email, current, next, await currentSessionId());
    return ok ? json({ ok: true }) : json({ error: "invalid_credentials" }, 401);
  } catch (err) {
    return handleError(err);
  }
}
