import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  serial,
  varchar,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

// Role enum for simple staff/admin system
export const role = pgEnum("role", ["staff", "admin"]);

export type Role = (typeof role.enumValues)[number];

// --- بخش ENUM برای دسته‌بندی پرزه‌ها ---
export const sectionEnum = pgEnum("section", ["E", "D", "F", "G", "OLD"]);

// Extended user table with role
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: role("role").default("staff").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export type User = typeof user.$inferSelect;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  section: sectionEnum("section").default("E"),
  minStock: integer("min_stock").default(0).notNull(), // Added .notNull()
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جدول مشتریان ---
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جدول فروش ---
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id),
  customerId: integer("customer_id").references(() => customers.id),
  quantity: integer("quantity").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  outstanding: numeric("outstanding", { precision: 12, scale: 2 }).default("0"),
  isFullyPaid: boolean("is_fully_paid").default(false),
  saleDate: timestamp("sale_date").defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

// --- جدول پرداخت‌های بعدی مشتری ---
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  note: text("note"),
  receivedBy: text("received_by").references(() => user.id),
});

// --- جدول واردات (خرید از خارج) ---
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  advancePaid: numeric("advance_paid", { precision: 12, scale: 2 }).default(
    "0"
  ),
  remainingAmount: numeric("remaining_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),
  isFullyPaid: boolean("is_fully_paid").default(false),
  expectedArrival: timestamp("expected_arrival"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, arrived, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جزئیات پرزه‌های وارد شده ---
export const importItems = pgTable("import_items", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").references(() => imports.id),
  partId: integer("part_id").references(() => parts.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

// --- جدول تراکنش‌های انونتوری ---
export const inventory = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id),
  change: integer("change").notNull(), // + برای واردات / - برای فروش
  reason: varchar("reason", { length: 50 }), // 'sale', 'import', 'adjustment'
  referenceId: integer("reference_id"), // id از sale یا import
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

export const schema = {
  user,
  session,
  account,
  verification,
  parts,
  customers,
  sales,
  payments,
  imports,
  importItems,
  inventory,
};
