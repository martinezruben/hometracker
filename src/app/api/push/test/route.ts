import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireApiUser } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";
import { pushConfigured, sendPush } from "@/lib/push/send";

/** Envía una notificación de prueba a los dispositivos del usuario actual. */
export async function POST() {
  try {
    const user = await requireApiUser();
    if (!pushConfigured()) return json({ error: "push_not_configured" }, 503);
    const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, user.id));
    let sent = 0;
    for (const s of subs) {
      const res = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title: "HomeTracker", body: "Las notificaciones funcionan 🎉", url: "/" },
      );
      if (res === "sent") sent++;
      else if (res === "gone") await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
    }
    return json({ sent, devices: subs.length });
  } catch (err) {
    return handleError(err);
  }
}
