import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin";
import { ProfileForm } from "@/components/profile/profile-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 flex flex-col items-center">
        <div className="w-full max-w-2xl mb-8">
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            Profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your personal profile information and security.
          </p>
        </div>

        <ProfileForm />
      </main>
    </div>
  );
}
