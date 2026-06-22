import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/50">
      <ResetPasswordForm token={token} />
    </div>
  );
}
