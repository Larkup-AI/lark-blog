import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession, isAdminEmail } from "@/lib/admin";
import { AdminAuthForm } from "@/components/blogs/admin-auth-form";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  const session = await getSession();
  if (session?.user && isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return (
    <Suspense>
      <AdminAuthForm />
    </Suspense>
  );
}
