import { z } from "zod";
import { requireApiUser } from "@/lib/auth/access";
import { acceptInvitation } from "@/lib/households";
import { handleError, json } from "@/lib/http";

const body = z.object({ token: z.string().min(20).max(100) });

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const { token } = body.parse(await request.json());
    const householdId = await acceptInvitation(user, token);
    if (!householdId) return json({ error: "invalid_invitation" }, 400);
    return json({ ok: true, householdId });
  } catch (err) {
    return handleError(err);
  }
}
