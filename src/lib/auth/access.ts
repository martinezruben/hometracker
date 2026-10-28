import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { getActiveHousehold, requireRole } from "./membership";
import { UnauthorizedError, type Role } from "./roles";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Punto de entrada para páginas y endpoints de un hogar: exige sesión y membresía.
 * Toda consulta a tablas con `household_id` debe usar el `householdId` devuelto aquí.
 */
export async function requireMember(householdId: string, min: Role = "viewer") {
  const user = await requireUser();
  const role = await requireRole(user.id, householdId, min);
  return { user, role, householdId };
}

export async function requireActiveHousehold() {
  const user = await requireUser();
  const household = await getActiveHousehold(user.id);
  if (!household) redirect("/onboarding");
  return { user, household };
}

/** Variantes para Route Handlers: lanzan errores (401/403) en vez de redirigir. */
export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireApiMember(householdId: string, min: Role = "viewer") {
  const user = await requireApiUser();
  const role = await requireRole(user.id, householdId, min);
  return { user, role, householdId };
}
