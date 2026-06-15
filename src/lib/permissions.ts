type Role = "ADMIN" | "MODERATOR" | "MEMBER";

export const permissions: Record<Role, string[]> = {
  ADMIN: [
    "manage_users",
    "manage_facilities",
    "moderate_rebuttals",
    "publish_rebuttals",
  ],

  MODERATOR: [
    "moderate_rebuttals",
    "publish_rebuttals",
  ],

  MEMBER: [],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: string,
  permission: string
): boolean {
  const rolePermissions =
    permissions[role as Role] || [];

  return rolePermissions.includes(permission);
}