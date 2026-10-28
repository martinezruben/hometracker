import { requireApiUser } from "@/lib/auth/access";
import { NotFoundError } from "@/lib/auth/roles";
import { getPhotoAccess } from "@/lib/boxes/data";
import { uuid } from "@/lib/boxes/schemas";
import { handleError } from "@/lib/http";
import { getStorage } from "@/lib/storage";

/** Sirve una foto solo a miembros del hogar dueño. `?thumb=1` devuelve la miniatura. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const access = await getPhotoAccess(user.id, uuid.parse((await ctx.params).id));
    if (!access) throw new NotFoundError();
    const { photo } = access;
    const wantThumb = new URL(request.url).searchParams.get("thumb") === "1" && photo.thumbKey;
    const key = wantThumb ? photo.thumbKey! : photo.storageKey;
    const file = await getStorage().get(key);
    if (!file) throw new NotFoundError();
    return new Response(file.body, {
      headers: {
        "content-type": wantThumb ? "image/jpeg" : photo.mimeType,
        // El id es único e inmutable: se puede cachear en el dispositivo (privado).
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
