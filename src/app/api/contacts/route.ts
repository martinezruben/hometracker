import { requireApiUser } from "@/lib/auth/access";
import { getActiveHousehold } from "@/lib/auth/membership";
import { ForbiddenError, hasRole } from "@/lib/auth/roles";
import { createContact, listContacts } from "@/lib/contacts/data";
import { contactCreate } from "@/lib/contacts/schemas";
import { handleError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    return json({ contacts: household ? await listContacts(household.id, q) : [] });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const household = await getActiveHousehold(user.id);
    if (!household || !hasRole(household.role, "member")) throw new ForbiddenError();
    const input = contactCreate.parse(await request.json());
    const contact = await createContact(household.id, user.id, {
      ...input,
      category: input.category ?? null,
      phone: input.phone ?? null,
      email: input.email || null,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
    });
    if (!contact) throw new ForbiddenError();
    return json({ contact }, 201);
  } catch (err) {
    return handleError(err);
  }
}
