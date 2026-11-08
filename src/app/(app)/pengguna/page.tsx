import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { listOutlets, requireUser } from "@/lib/auth";
import { UsersClient } from "./UsersClient";

export default async function PenggunaPage() {
  const me = await requireUser("ADMIN");
  const [users, outlets] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        username: schema.users.username,
        role: schema.users.role,
        outletId: schema.users.outletId,
        active: schema.users.active,
      })
      .from(schema.users)
      .orderBy(asc(schema.users.name)),
    listOutlets(),
  ]);
  return <UsersClient users={users} meId={me.uid} outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} />;
}
