import { z } from "zod";
import { requireApiUser } from "@/lib/auth/access";
import { PASSWORD_MAX, PASSWORD_MIN, changePassword } from "@/lib/auth/password";
import { currentSessionId } from "@/lib/auth/session";
import { handleError, json } from "@/lib/http";

const body = z.object({ next: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX) });

/** Cambia la contraseña de la persona con sesión iniciada; cierra sus otras sesiones. */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const { next } = body.parse(await request.json());
    await changePassword(user.id, next, await currentSessionId());
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
