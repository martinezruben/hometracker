import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { createHousehold } from "@/lib/households";
import { handleError, json } from "@/lib/http";

const body = z.object({ name: z.string().trim().min(1).max(120), userName: z.string().trim().min(1).max(120).optional() });

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const { name, userName } = body.parse(await request.json());
    const id = await createHousehold(user.id, name);
    if (userName && !user.name) await db.update(schema.users).set({ name: userName }).where(eq(schema.users.id, user.id));
    return json({ id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
