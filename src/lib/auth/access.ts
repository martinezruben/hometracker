import "server-only";
import { redirect } from "next/navigation";
import { getSessionContext, getSessionUser } from "./session";
import { requireRole } from "./membership";
import { assertRole } from "./roles";
import { NotFoundError, UnauthorizedError, type Role } from "./roles";

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
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.household) redirect("/onboarding");
  return { user: ctx.user, household: ctx.household };
}

/** Para Route Handlers de ajustes del hogar: persona con sesión que es administradora de su hogar activo. */
export async function requireApiAdminHousehold() {
  const ctx = await getSessionContext();
  if (!ctx) throw new UnauthorizedError();
  if (!ctx.household) throw new NotFoundError();
  assertRole(ctx.household.role, "admin");
  return { user: ctx.user, household: ctx.household };
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
