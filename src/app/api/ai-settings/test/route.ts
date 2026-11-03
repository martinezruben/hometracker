import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireApiAdminHousehold } from "@/lib/auth/access";
import { handleError, json } from "@/lib/http";
import { consume } from "@/lib/rate-limit";
import { isAiModel, validApiKey } from "@/lib/vision/models";
import { getAiStatus, resolveAiConfig } from "@/lib/vision/settings";

const body = z.object({ apiKey: z.string().max(400).optional(), model: z.string().max(60).optional() });

/**
 * Comprueba la conexión con el proveedor sin enviar ninguna foto: consulta el modelo elegido (no consume tokens).
 * Si llega `apiKey` se prueba esa (aún sin guardar); si no, la que ya usaría el hogar.
 */
export async function POST(request: Request) {
  try {
    const { user, household } = await requireApiAdminHousehold();
    consume(`ai-test:${user.id}`, 10, 60_000);
    const input = body.parse(await request.json().catch(() => ({})));
    const typed = input.apiKey ? validApiKey(input.apiKey) : null;
    if (input.apiKey && !typed) return json({ ok: false, error: "invalid_apiKey" });
    const saved = typed ? null : await resolveAiConfig(household.id);
    const apiKey = typed ?? saved?.apiKey;
    if (!apiKey) return json({ ok: false, error: "not_configured" });
    const model = isAiModel(input.model) ? input.model : (await getAiStatus(household.id)).model;

    try {
      await new Anthropic({ apiKey, maxRetries: 0, timeout: 15_000 }).models.retrieve(model);
      return json({ ok: true, model });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return json({ ok: false, error: "invalid_key" });
      if (err instanceof Anthropic.PermissionDeniedError) return json({ ok: false, error: "forbidden" });
      if (err instanceof Anthropic.NotFoundError) return json({ ok: false, error: "model_unavailable" });
      return json({ ok: false, error: "unreachable" });
    }
  } catch (err) {
    return handleError(err);
  }
}
