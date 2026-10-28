import { z } from "zod";
import { requireApiMember } from "@/lib/auth/access";
import { createInvitation } from "@/lib/households";
import { boxUrlBase } from "@/lib/config";
import { handleError, json } from "@/lib/http";

const body = z.object({ role: z.enum(["admin", "member", "viewer"]).default("member") });

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user } = await requireApiMember(id, "admin");
    const { role } = body.parse(await request.json());
    const token = await createInvitation(id, user.id, role);
    return json({ url: `${boxUrlBase()}/join/${token}` }, 201);
  } catch (err) {
    return handleError(err);
  }
}
