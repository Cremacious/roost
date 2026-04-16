import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalAdminDevEnabled } from "@/lib/admin/devAccess";
import { DevAdminPanel } from "./DevAdminPanel";

export default async function AdminDevPage() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!isLocalAdminDevEnabled(host)) {
    notFound();
  }

  return <DevAdminPanel />;
}
