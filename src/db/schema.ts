import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "ONLINE"] as const;
export const PAYMENT_METHODS = ["CASH", "QRIS", "DEBIT", "TRANSFER"] as const;

/** Pengaturan umum usaha (satu baris) */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  businessName: text("business_name").notNull().default("Bakso Terbang"),
});

/** Outlet / cabang, termasuk pajak & pengaturan printer per outlet */
export const outlets = sqliteTable("outlets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  taxPercent: integer("tax_percent").notNull().default(0),
  servicePercent: integer("service_percent").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // printer
  paperWidth: integer("paper_width").notNull().default(80), // 58 atau 80 mm
  fontSize: integer("font_size").notNull().default(12),
  receiptHeader: text("receipt_header").notNull().default(""),
  receiptFooter: text("receipt_footer").notNull().default("Terima kasih atas kunjungan Anda!"),
  showLogo: integer("show_logo", { mode: "boolean" }).notNull().default(true),
  autoPrintReceipt: integer("auto_print_receipt", { mode: "boolean" }).notNull().default(true),
  receiptCopies: integer("receipt_copies").notNull().default(1),
  printKitchenTicket: integer("print_kitchen_ticket", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "KASIR"] }).notNull().default("KASIR"),
  outletId: integer("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
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
  price: integer("price").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const diningTables = sqliteTable(
  "dining_tables",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    outletId: integer("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    capacity: integer("capacity").notNull().default(4),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("dining_tables_outlet_idx").on(t.outletId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    outletId: integer("outlet_id")
      .notNull()
      .references(() => outlets.id),
    type: text("type", { enum: ORDER_TYPES }).notNull().default("DINE_IN"),
    tableId: integer("table_id").references(() => diningTables.id, { onDelete: "set null" }),
    tableNumber: text("table_number"),
    customerName: text("customer_name"),
    guests: integer("guests"),
    /** OPEN = open bill, PAID = lunas, VOID = open bill dibatalkan, REFUNDED = transaksi lunas yang direfund */
    status: text("status", { enum: ["OPEN", "PAID", "VOID", "REFUNDED"] }).notNull().default("OPEN"),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    service: integer("service").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull().default(0),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }),
    paidAmount: integer("paid_amount").notNull().default(0),
    change: integer("change_amount").notNull().default(0),
    note: text("note"),
    cashierId: integer("cashier_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    cancelReason: text("cancel_reason"),
    refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
    refundedById: integer("refunded_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_paid_at_idx").on(t.paidAt),
    index("orders_outlet_idx").on(t.outletId),
  ],
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
    categoryName: text("category_name"),
    price: integer("price").notNull(),
    qty: integer("qty").notNull(),
    note: text("note"),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Sesi kasir: dibuka dengan modal awal, ditutup (settlement) dengan uang yang dihitung di laci */
export const cashierShifts = sqliteTable(
  "cashier_shifts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    outletId: integer("outlet_id")
      .notNull()
      .references(() => outlets.id),
    status: text("status", { enum: ["OPEN", "CLOSED"] }).notNull().default("OPEN"),
    openingCash: integer("opening_cash").notNull().default(0),
    openedById: integer("opened_by_id").references(() => users.id, { onDelete: "set null" }),
    openedAt: integer("opened_at", { mode: "timestamp_ms" }).notNull(),
    closedById: integer("closed_by_id").references(() => users.id, { onDelete: "set null" }),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
    expectedCash: integer("expected_cash"),
    countedCash: integer("counted_cash"),
    note: text("note"),
  },
  (t) => [index("cashier_shifts_outlet_idx").on(t.outletId, t.status)],
);

export type User = typeof users.$inferSelect;
export type CashierShift = typeof cashierShifts.$inferSelect;
export type Outlet = typeof outlets.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type DiningTable = typeof diningTables.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderType = (typeof ORDER_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
