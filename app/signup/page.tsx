import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/admin";
import { signupEnabled } from "@/lib/config";
import { getSetupState } from "@/app/actions/setup";
import { SignupForm } from "@/components/blogs/signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // Open sign-up is cloud-only (or self-host without DISABLE_SIGNUP).
  if (!signupEnabled()) notFound();

  // Fresh install → the first account is the owner, created via /setup.
  const { hasAdmin } = await getSetupState();
  if (!hasAdmin) redirect("/setup");

  const session = await getSession();
  if (session?.user) redirect("/");

  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
