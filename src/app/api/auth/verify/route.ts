import { z } from "zod";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { getActiveHousehold } from "@/lib/auth/membership";
import { handleError, json } from "@/lib/http";

const body = z.object({ email: z.string().email().max(255), code: z.string().length(6) });

export async function POST(request: Request) {
  try {
    const { email, code } = body.parse(await request.json());
    const user = await verifyOtp(email, code);
    if (!user) return json({ error: "invalid_code" }, 401);
    await createSession(user.id);
    const household = await getActiveHousehold(user.id);
    return json({ ok: true, hasHousehold: !!household });
  } catch (err) {
    return handleError(err);
  }
}
