import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { StockClient } from "./StockClient";

export default async function StokPage() {
  await requireUser("ADMIN");
  const [products, movements] = await Promise.all([
    db.select().from(schema.products).where(eq(schema.products.trackStock, true)).orderBy(asc(schema.products.name)),
    db
      .select({
        m: schema.stockMovements,
        productName: schema.products.name,
        userName: schema.users.name,
      })
      .from(schema.stockMovements)
      .innerJoin(schema.products, eq(schema.stockMovements.productId, schema.products.id))
      .leftJoin(schema.users, eq(schema.stockMovements.userId, schema.users.id))
      .orderBy(desc(schema.stockMovements.createdAt), desc(schema.stockMovements.id))
      .limit(100),
  ]);
  return (
    <StockClient
      products={products}
      movements={movements.map((x) => ({ ...x.m, createdAt: x.m.createdAt.getTime(), productName: x.productName, userName: x.userName }))}
    />
  );
}
