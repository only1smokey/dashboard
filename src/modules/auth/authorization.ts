export const userRoles = ["user", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export interface AuthorizationRecord {
  role: UserRole;
  isActive: boolean;
}

export function hasActiveRole(
  authorization: AuthorizationRecord | null,
  requiredRole?: UserRole,
) {
  if (!authorization?.isActive) {
    return false;
  }

  return requiredRole === undefined || authorization.role === requiredRole;
}
