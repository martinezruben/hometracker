import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";

const body = z.object({ name: z.string().trim().min(1).max(120) });

/** Actualiza el nombre de la persona (se usa en el saludo y en los avatares). */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const { name } = body.parse(await request.json());
    await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
