"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { brand } from "@/lib/config";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) {
        const message = error.message ?? "Could not create your account.";
        setError(message);
        toast.error("Sign up failed", { description: message });
        return;
      }
      toast.success("Account created", { description: "Setting up your workspace…" });
      router.push("/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected network error.";
      setError(message);
      toast.error("Something went wrong", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex items-center justify-center gap-1 text-center">
          <span className="font-serif text-3xl tracking-tight text-foreground">
            {brand.shortName}
          </span>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Blog Studio
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Create your {brand.name} account and workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-left">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-10 bg-background shadow-none!"
              />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 bg-background shadow-none!"
              />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 bg-background pr-10 shadow-none!"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide" : "Show"} password</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="h-10 w-full text-sm">
              {loading ? "Please wait..." : "Create account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/blogs/sign-in" className="text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
