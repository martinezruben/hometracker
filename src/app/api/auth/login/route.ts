import { authenticate } from "@/lib/auth/password";
import { loginBody } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";
import { getActiveHousehold } from "@/lib/auth/membership";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { email, password } = loginBody.parse(await request.json());
    const user = await authenticate(email, password);
    if (!user) return json({ error: "invalid_credentials" }, 401);
    await createSession(user.id);
    const household = await getActiveHousehold(user.id);
    return json({ ok: true, hasHousehold: !!household });
  } catch (err) {
    return handleError(err);
  }
}
