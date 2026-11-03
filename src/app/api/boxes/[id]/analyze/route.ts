import { requireApiUser } from "@/lib/auth/access";
import { assertRole, NotFoundError } from "@/lib/auth/roles";
import { getBoxAccess } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { handleError, json } from "@/lib/http";
import { consume } from "@/lib/rate-limit";
import { analyzeBoxPhoto, VisionError, type ImageType } from "@/lib/vision/analyze";
import { resolveAiConfig } from "@/lib/vision/settings";

const ALLOWED: ImageType[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE = 5 * 1024 * 1024;

const STATUS: Record<VisionError["code"], number> = { ai_not_configured: 503, ai_refused: 422, ai_bad_response: 502, ai_unavailable: 502 };

/**
 * Detecta los objetos de una foto de caja con un modelo de visión. NO guarda nada: devuelve la lista para que la
 * persona la revise y luego se creen los objetos con los endpoints de siempre.
 * Multipart con el campo `file` (JPEG, PNG o WebP, máx. 5 MB; la app ya la comprime a 1600 px).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const boxId = uuid.parse((await ctx.params).id);
    const access = await getBoxAccess(user.id, boxId);
    if (!access) throw new NotFoundError();
    assertRole(access.role, "member");
    const ai = await resolveAiConfig(access.box.householdId); // clave y modelo de Ajustes (o la del servidor)
    if (!ai) return json({ error: "ai_not_configured" }, 503);

    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !ALLOWED.includes(file.type as ImageType) || file.size > MAX_FILE || file.size === 0) {
      return json({ error: "invalid_file" }, 400);
    }

    // Frena ráfagas y gasto accidental: por persona y por hogar (el tope mensual vendrá aparte).
    consume(`ai:user:${user.id}`, 6, 60_000);
    consume(`ai:household:${access.box.householdId}`, 40, 3_600_000);

    const result = await analyzeBoxPhoto({ data: Buffer.from(await file.arrayBuffer()), mediaType: file.type as ImageType }, { apiKey: ai.apiKey, model: ai.model });
    return json({ items: result.items, model: result.model, usage: result.usage });
  } catch (err) {
    if (err instanceof VisionError) return json({ error: err.code }, STATUS[err.code]);
    return handleError(err);
  }
}
