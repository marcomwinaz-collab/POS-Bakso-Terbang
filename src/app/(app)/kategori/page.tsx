import { asc, sql, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { CategoriesClient } from "./CategoriesClient";

export default async function KategoriPage() {
  await requireUser("ADMIN");
  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      sort: schema.categories.sort,
      count: sql<number>`count(${schema.products.id})`,
    })
    .from(schema.categories)
    .leftJoin(schema.products, eq(schema.products.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(asc(schema.categories.sort), asc(schema.categories.name));
  return <CategoriesClient rows={rows} />;
}
