import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { createDocument, listDocuments } from "@/lib/documents/data";
import { documentCreate } from "@/lib/documents/schemas";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    const params = new URL(request.url).searchParams;
    const docs = household ? await listDocuments(household.id, { kind: params.get("kind") ?? undefined, q: params.get("q") ?? undefined }) : [];
    return json({ documents: docs });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = documentCreate.parse(await request.json());
    const doc = await createDocument(household.id, user.id, {
      ...input,
      issuedAt: input.issuedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      amount: input.amount ?? null,
      providerId: input.providerId ?? null,
      applianceId: input.applianceId ?? null,
      notes: input.notes ?? null,
    });
    if (!doc) throw new ForbiddenError();
    return json({ document: doc }, 201);
  } catch (err) {
    return handleError(err);
  }
}
