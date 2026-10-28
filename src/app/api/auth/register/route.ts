import { EmailTakenError, registerUser } from "@/lib/auth/password";
import { registerBody } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";
import { handleError, json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { email, password } = registerBody.parse(await request.json());
    const user = await registerUser(email, password);
    await createSession(user.id);
    return json({ ok: true, hasHousehold: false });
  } catch (err) {
    if (err instanceof EmailTakenError) return json({ error: "email_taken" }, 409);
    return handleError(err);
  }
}
