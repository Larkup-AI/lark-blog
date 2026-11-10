import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession, isAdminEmail } from "@/lib/admin";
import { getSetupState } from "@/app/actions/setup";
import { AdminAuthForm } from "@/components/blogs/admin-auth-form";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  // Fresh install with no admin yet → send everyone to the setup wizard.
  const { hasAdmin } = await getSetupState();
  if (!hasAdmin) redirect("/setup");

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
