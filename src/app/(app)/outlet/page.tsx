import { requireUser, listOutlets } from "@/lib/auth";
import { OutletsClient } from "./OutletsClient";

export default async function OutletPage() {
  await requireUser("ADMIN");
  const outlets = await listOutlets();
  return <OutletsClient outlets={outlets} />;
}
