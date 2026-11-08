import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { UsersClient } from "./UsersClient";

export default async function PenggunaPage() {
  const me = await requireUser("ADMIN");
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      username: schema.users.username,
      role: schema.users.role,
      active: schema.users.active,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));
  return <UsersClient users={users} meId={me.uid} />;
}
