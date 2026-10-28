import { z } from "zod";
import { requireApiUser } from "@/lib/auth/access";
import { createHousehold } from "@/lib/households";
import { handleError, json } from "@/lib/http";

const body = z.object({ name: z.string().trim().min(1).max(120) });

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const { name } = body.parse(await request.json());
    const id = await createHousehold(user.id, name);
    return json({ id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
