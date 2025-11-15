import { relations } from "drizzle-orm/relations";
import { user, account, session, imports, importItems, parts, inventoryTransactions, sales, customers, payments } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	inventoryTransactions: many(inventoryTransactions),
	sales: many(sales),
	payments: many(payments),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const importItemsRelations = relations(importItems, ({one}) => ({
	import: one(imports, {
		fields: [importItems.importId],
		references: [imports.id]
	}),
	part: one(parts, {
		fields: [importItems.partId],
		references: [parts.id]
	}),
}));

export const importsRelations = relations(imports, ({many}) => ({
	importItems: many(importItems),
}));

export const partsRelations = relations(parts, ({many}) => ({
	importItems: many(importItems),
	inventoryTransactions: many(inventoryTransactions),
	sales: many(sales),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one}) => ({
	part: one(parts, {
		fields: [inventoryTransactions.partId],
		references: [parts.id]
	}),
	user: one(user, {
		fields: [inventoryTransactions.createdBy],
		references: [user.id]
	}),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	part: one(parts, {
		fields: [sales.partId],
		references: [parts.id]
	}),
	customer: one(customers, {
		fields: [sales.customerId],
		references: [customers.id]
	}),
	user: one(user, {
		fields: [sales.createdBy],
		references: [user.id]
	}),
	payments: many(payments),
}));

export const customersRelations = relations(customers, ({many}) => ({
	sales: many(sales),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	sale: one(sales, {
		fields: [payments.saleId],
		references: [sales.id]
	}),
	user: one(user, {
		fields: [payments.receivedBy],
		references: [user.id]
	}),
}));