import "server-only";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, localDayStart, todayLocal } from "./format";

export function parseRange(sp: { from?: string; to?: string }, defaultDays = 0) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const to = sp.to && re.test(sp.to) ? sp.to : todayLocal();
  const from = sp.from && re.test(sp.from) ? sp.from : addDays(to, -defaultDays);
  return { from, to, start: new Date(localDayStart(from)), end: new Date(localDayStart(addDays(to, 1))) };
}

export async function listTransactions(opts: { start: Date; end: Date; status?: string }) {
  const where: SQL[] = [gte(schema.orders.createdAt, opts.start), lt(schema.orders.createdAt, opts.end)];
  if (opts.status === "PAID" || opts.status === "VOID" || opts.status === "OPEN") where.push(eq(schema.orders.status, opts.status));
  return db
    .select({ order: schema.orders, tableName: schema.diningTables.name, cashierName: schema.users.name })
    .from(schema.orders)
    .leftJoin(schema.diningTables, eq(schema.orders.tableId, schema.diningTables.id))
    .leftJoin(schema.users, eq(schema.orders.cashierId, schema.users.id))
    .where(and(...where))
    .orderBy(desc(schema.orders.createdAt))
    .limit(2000);
}
