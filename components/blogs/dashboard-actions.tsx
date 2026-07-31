"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Loader2, Users, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { createPost } from "@/app/actions/posts";
import Link from "next/link";

export function DashboardActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const { data: session } = useSession();

  const onNew = () => {
    startTransition(async () => {
      const id = await createPost();
      router.push(`/blogs/${id}`);
    });
  };

  const onSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/blogs/sign-in");
    router.refresh();
  };

  const user = session?.user;
  const isFullAdmin =
    (user as { role?: string } | undefined)?.role === "full_admin";
  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "U";

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
        <Link href="/analytics" aria-label="Analytics">
          <BarChart3 className="h-4 w-4" />
        </Link>
      </Button>
      {isFullAdmin && (
        <div className="flex gap-0 items-center">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/teams">
              <Users className="h-4 w-4 " />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
      <Button size="sm" onClick={onNew} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        New post
      </Button>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full ml-2"
            >
              <Avatar className="h-8 w-8 border bg-background border-border/70">
                <AvatarImage src={user.image || ""} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} disabled={signingOut}>
              {signingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
