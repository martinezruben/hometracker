import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";
import { endpointHash } from "@/lib/reminders/run";

const sub = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

/** Guarda (o reasigna al usuario actual) la suscripción push de este dispositivo. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const { endpoint, keys } = sub.parse(await request.json());
    const ua = request.headers.get("user-agent")?.slice(0, 255) ?? null;
    await db
      .insert(schema.pushSubscriptions)
      .values({
        id: randomUUID(),
        userId: user.id,
        endpointHash: endpointHash(endpoint),
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: ua,
      })
      .onDuplicateKeyUpdate({ set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua } });
    return json({ ok: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser();
    const { endpoint } = z.object({ endpoint: z.string().url().max(2000) }).parse(await request.json());
    const hash = endpointHash(endpoint);
    const [row] = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpointHash, hash));
    if (row && row.userId === user.id) {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, row.id));
    }
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
