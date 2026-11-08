import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ProductsClient } from "./ProductsClient";

export default async function ProdukPage() {
  await requireUser("ADMIN");
  const [products, categories] = await Promise.all([
    db.select().from(schema.products).orderBy(asc(schema.products.name)),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort), asc(schema.categories.name)),
  ]);
  return <ProductsClient products={products} categories={categories} />;
}
