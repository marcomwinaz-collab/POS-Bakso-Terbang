import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "KASIR"] }).notNull().default("KASIR"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  sku: text("sku"),
  price: integer("price").notNull().default(0),
  cost: integer("cost").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  trackStock: integer("track_stock", { mode: "boolean" }).notNull().default(true),
  minStock: integer("min_stock").notNull().default(5),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const diningTables = sqliteTable("dining_tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  storeName: text("store_name").notNull().default("Bakso Terbang"),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  taxPercent: integer("tax_percent").notNull().default(0),
  servicePercent: integer("service_percent").notNull().default(0),
  receiptFooter: text("receipt_footer").notNull().default("Terima kasih atas kunjungan Anda!"),
});

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    type: text("type", { enum: ["DINE_IN", "TAKEAWAY"] }).notNull().default("DINE_IN"),
    tableId: integer("table_id").references(() => diningTables.id, { onDelete: "set null" }),
    customerName: text("customer_name"),
    status: text("status", { enum: ["OPEN", "PAID", "VOID"] }).notNull().default("OPEN"),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    service: integer("service").notNull().default(0),
    total: integer("total").notNull().default(0),
    paymentMethod: text("payment_method", { enum: ["CASH", "QRIS", "DEBIT", "TRANSFER"] }),
    paidAmount: integer("paid_amount").notNull().default(0),
    change: integer("change_amount").notNull().default(0),
    note: text("note"),
    voidReason: text("void_reason"),
    cashierId: integer("cashier_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_paid_at_idx").on(t.paidAt)],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    cost: integer("cost").notNull().default(0),
    qty: integer("qty").notNull(),
    note: text("note"),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["IN", "OUT", "ADJUST", "SALE", "VOID"] }).notNull(),
    qty: integer("qty").notNull(),
    stockAfter: integer("stock_after").notNull(),
    note: text("note"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type DiningTable = typeof diningTables.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;
