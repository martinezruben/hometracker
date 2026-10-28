import { destroySession } from "@/lib/auth/session";
import { handleError, json } from "@/lib/http";

export async function POST() {
  try {
    await destroySession();
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
