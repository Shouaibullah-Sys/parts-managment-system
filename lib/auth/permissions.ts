import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  parts: ["read", "create", "update", "delete"],
  orders: ["read", "create", "update", "delete"],
  users: ["read", "create", "update", "delete"],
  system: ["read", "update"],
} as const;

const ac = createAccessControl(statement);

const staff = ac.newRole({
  parts: ["read", "create", "update"],
  orders: ["read", "create", "update"],
  users: ["read"],
  system: ["read"],
});

const admin = ac.newRole({
  parts: ["read", "create", "update", "delete"],
  orders: ["read", "create", "update", "delete"],
  users: ["read", "create", "update", "delete"],
  system: ["read", "update"],
});

export { ac, admin, staff, statement };
