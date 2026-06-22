import { redirect } from "next/navigation";
import { getSession, isFullAdmin } from "@/lib/admin";
import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");
  if (!isFullAdmin(session.user)) {
    redirect("/");
  }

  const settings = await getSettings();

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
            Back to Posts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure your blog studio preferences and API access.
          </p>
        </div>

        <SettingsForm initialSettings={settings} />
      </main>
    </div>
  );
}
