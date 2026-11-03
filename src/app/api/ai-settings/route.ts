import { z } from "zod";
import { requireApiAdminHousehold } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";
import { getAiStatus, InvalidSettingError, saveAiSettings } from "@/lib/vision/settings";

const body = z.object({ apiKey: z.string().max(400).optional(), model: z.string().max(60).optional(), clearKey: z.boolean().optional() });

/** Estado de la IA del hogar (solo administradores). Nunca devuelve la clave, solo su final. */
export async function GET() {
  try {
    const { household } = await requireApiAdminHousehold();
    return json(await getAiStatus(household.id));
  } catch (err) {
    return handleError(err);
  }
}

/** Guarda la clave (cifrada) y/o el modelo. */
export async function PUT(request: Request) {
  try {
    const { user, household } = await requireApiAdminHousehold();
    const input = body.parse(await request.json());
    await saveAiSettings(household.id, user.id, input);
    return json(await getAiStatus(household.id));
  } catch (err) {
    if (err instanceof InvalidSettingError) return json({ error: `invalid_${err.field}` }, 400);
    return handleError(err);
  }
}

/** Quita la clave del hogar (queda la del servidor, si hay). */
export async function DELETE() {
  try {
    const { user, household } = await requireApiAdminHousehold();
    await saveAiSettings(household.id, user.id, { clearKey: true });
    return json(await getAiStatus(household.id));
  } catch (err) {
    return handleError(err);
  }
}
