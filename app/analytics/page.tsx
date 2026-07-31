import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, isAdmin } from "@/lib/admin";
import { AnalyticsDashboard } from "@/components/blogs/analytics-dashboard";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) redirect("/blogs/sign-in");

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-5xl items-center px-6"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to posts</Link></div></header>
      <main className="mx-auto max-w-5xl px-6 py-12"><AnalyticsDashboard /></main>
    </div>
  );
}
