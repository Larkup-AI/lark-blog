"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function AdminAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surface the "signed in but not the admin" bounce, which is otherwise silent.
  useEffect(() => {
    if (searchParams.get("error") === "forbidden") {
      const message =
        "That account is signed in but is not the configured admin email.";
      setError(message);
      toast.error("Access denied", { description: message });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email({ email, password });

      if (error) {
        const message =
          error.message ?? "Something went wrong. Please try again.";
        setError(message);
        toast.error("Sign in failed", {
          description: message,
        });
        return;
      }

      toast.success("Signed in", {
        description: "Taking you to the dashboard…",
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected network error.";
      setError(message);
      toast.error("Something went wrong", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 text-center flex items-center justify-center gap-1">
          <span className="font-serif text-3xl tracking-tight text-foreground">
            Larkup
          </span>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Blog Studio
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 text-center">
          {/* <h1 className="text-xl font-medium tracking-tight text-foreground">
            Sign in
          </h1> */}
          <p className="text-sm text-muted-foreground">
            {/* Access the private writing dashboard. */}
            Sign in to your Larkup-Blog account to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-background h-10 shadow-none!"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  className="bg-background pr-10 h-10 shadow-none!"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm"
            >
              {loading ? "Please wait..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Only the configured admin email can access the dashboard.
        </p>
      </div>
    </main>
  );
}
