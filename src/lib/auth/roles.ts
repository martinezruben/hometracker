export type Role = "admin" | "member" | "viewer";

const rank: Record<Role, number> = { viewer: 0, member: 1, admin: 2 };

export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para esta acción") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Sesión requerida");
    this.name = "UnauthorizedError";
  }
}

export const hasRole = (role: Role, min: Role) => rank[role] >= rank[min];

export function assertRole(role: Role | null | undefined, min: Role): Role {
  if (!role || !hasRole(role, min)) throw new ForbiddenError();
  return role;
}
