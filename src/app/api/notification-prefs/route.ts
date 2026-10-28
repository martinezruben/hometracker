import { z } from "zod";
import { requireApiUser } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";
import { getPrefs, setPref } from "@/lib/notifications/data";

const body = z.object({ type: z.enum(["maintenance", "warranty", "tasks", "weekly"]), enabled: z.boolean() });

export async function GET() {
  try {
    const user = await requireApiUser();
    return json({ prefs: await getPrefs(user.id) });
  } catch (err) {
    return handleError(err);
  }
}

/** Guarda una preferencia (se llama al mover cada interruptor). */
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser();
    const { type, enabled } = body.parse(await request.json());
    await setPref(user.id, type, enabled);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
