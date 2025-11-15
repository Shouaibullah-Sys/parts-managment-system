import { pgTable, text, timestamp, foreignKey, unique, boolean, serial, varchar, numeric, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const role = pgEnum("role", ['staff', 'admin'])
export const section = pgEnum("section", ['E', 'D', 'F', 'G', 'OLD'])


export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	role: role().default('staff').notNull(),
	approved: boolean().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const imports = pgTable("imports", {
	id: serial().primaryKey().notNull(),
	supplierName: varchar("supplier_name", { length: 255 }).notNull(),
	invoiceNumber: varchar("invoice_number", { length: 100 }),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).notNull(),
	advancePaid: numeric("advance_paid", { precision: 12, scale:  2 }).default('0'),
	remainingAmount: numeric("remaining_amount", { precision: 12, scale:  2 }).default('0'),
	isFullyPaid: boolean("is_fully_paid").default(false),
	expectedArrival: timestamp("expected_arrival", { mode: 'string' }),
	status: varchar({ length: 50 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const importItems = pgTable("import_items", {
	id: serial().primaryKey().notNull(),
	importId: integer("import_id"),
	partId: integer("part_id"),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.importId],
			foreignColumns: [imports.id],
			name: "import_items_import_id_imports_id_fk"
		}),
	foreignKey({
			columns: [table.partId],
			foreignColumns: [parts.id],
			name: "import_items_part_id_parts_id_fk"
		}),
]);

export const parts = pgTable("parts", {
	id: serial().primaryKey().notNull(),
	partNumber: varchar("part_number", { length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	section: section().default('E'),
	minStock: integer("min_stock").default(0).notNull(),
	costPrice: numeric("cost_price", { precision: 12, scale:  2 }),
	salePrice: numeric("sale_price", { precision: 12, scale:  2 }),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("parts_part_number_unique").on(table.partNumber),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: serial().primaryKey().notNull(),
	partId: integer("part_id"),
	change: integer().notNull(),
	reason: varchar({ length: 50 }),
	referenceId: integer("reference_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: text("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.partId],
			foreignColumns: [parts.id],
			name: "inventory_transactions_part_id_parts_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "inventory_transactions_created_by_user_id_fk"
		}),
]);

export const sales = pgTable("sales", {
	id: serial().primaryKey().notNull(),
	partId: integer("part_id"),
	customerId: integer("customer_id"),
	quantity: integer().notNull(),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 12, scale:  2 }).default('0'),
	outstanding: numeric({ precision: 12, scale:  2 }).default('0'),
	isFullyPaid: boolean("is_fully_paid").default(false),
	saleDate: timestamp("sale_date", { mode: 'string' }).defaultNow(),
	createdBy: text("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.partId],
			foreignColumns: [parts.id],
			name: "sales_part_id_parts_id_fk"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "sales_customer_id_customers_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "sales_created_by_user_id_fk"
		}),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	saleId: integer("sale_id"),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	paymentDate: timestamp("payment_date", { mode: 'string' }).defaultNow(),
	note: text(),
	receivedBy: text("received_by"),
}, (table) => [
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "payments_sale_id_sales_id_fk"
		}),
	foreignKey({
			columns: [table.receivedBy],
			foreignColumns: [user.id],
			name: "payments_received_by_user_id_fk"
		}),
]);
