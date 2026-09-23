export const permissions = {
  staff: {
    parts: ["read", "create", "update"],
    orders: ["read", "create", "update"],
    users: ["read"],
    system: ["read"],
  },
  admin: {
    parts: ["read", "create", "update", "delete"],
    orders: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    system: ["read", "update"],
  },
} as const;

export type Role = "staff" | "admin";
export type Resource = "parts" | "orders" | "users" | "system";
export type Action = "read" | "create" | "update" | "delete";

export function hasPermission(
  role: Role,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = permissions[role];
  if (!rolePermissions) return false;
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  return (resourcePermissions as readonly Action[]).includes(action);
}
