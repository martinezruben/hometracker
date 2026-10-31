import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireApiMember } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";

const body = z.object({ name: z.string().trim().min(1).max(120) });

/** Cambia el nombre del hogar (solo administradores). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireApiMember(id, "admin");
    const { name } = body.parse(await request.json());
    await db.update(schema.households).set({ name }).where(eq(schema.households.id, id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
