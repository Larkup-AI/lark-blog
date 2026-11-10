/**
 * Email abstraction with three providers:
 *   EMAIL_PROVIDER = resend | smtp | none   (default: inferred)
 *
 * - resend: RESEND_API_KEY, EMAIL_FROM
 * - smtp:   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM
 *           (uses nodemailer — `pnpm add nodemailer`, imported lazily)
 * - none:   email is disabled. Invites become copyable links and password reset
 *           is done by an owner/CLI. The app stays fully usable without email.
 *
 * If EMAIL_PROVIDER is unset we infer: RESEND_API_KEY → resend, SMTP_HOST → smtp,
 * otherwise → none. `isEmailEnabled()` lets the UI switch invite flows to links.
 */
import { brand } from "@/lib/config";

export type EmailProviderId = "resend" | "smtp" | "none";

export type SendEmailInput = {
  email: string;
  subject: string;
  react?: React.ReactNode;
  html?: string;
  text?: string;
};

export function getEmailProvider(): EmailProviderId {
  const explicit = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (explicit === "resend" || explicit === "smtp" || explicit === "none")
    return explicit;
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

export function isEmailEnabled(): boolean {
  return getEmailProvider() !== "none";
}

/**
 * DB-aware check used by server actions/UI to decide between email and link
 * flows. Reads the setup-wizard config first, then falls back to env.
 */
export async function isEmailEnabledResolved(): Promise<boolean> {
  try {
    const { resolveEmail } = await import("@/lib/app-config");
    return (await resolveEmail()).provider !== "none";
  } catch {
    return isEmailEnabled();
  }
}

function fromAddress(from?: string): string {
  return from || process.env.EMAIL_FROM || `${brand.name} <noreply@example.com>`;
}

function htmlToText(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendEmail(input: SendEmailInput): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const text = input.text ?? htmlToText(input.html);

  // Resolve the active provider + config: setup-wizard (DB) first, env fallback.
  let provider: EmailProviderId = getEmailProvider();
  let cfg: Record<string, any> = {};
  try {
    const { resolveEmail } = await import("@/lib/app-config");
    const resolved = await resolveEmail();
    provider = resolved.provider;
    cfg = resolved.config;
  } catch {
    // Fall back to env-only values below.
  }

  try {
    if (provider === "none") {
      // No transport configured. Don't throw — callers must handle link flows.
      console.info(`[email:none] suppressed "${input.subject}" → ${input.email}`);
      return { ok: false, skipped: true };
    }

    if (provider === "resend") {
      const { Resend } = await import("resend");
      const resend = new Resend(cfg.apiKey || process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: fromAddress(cfg.from),
        to: [input.email],
        subject: input.subject,
        html: input.html,
        react: input.react as any,
        text,
      });
      return { ok: true };
    }

    // smtp
    const nodemailer = await import("nodemailer");
    const user = cfg.user ?? process.env.SMTP_USER;
    const pass = cfg.pass ?? process.env.SMTP_PASS;
    const transport = nodemailer.createTransport({
      host: cfg.host || process.env.SMTP_HOST,
      port: Number(cfg.port || process.env.SMTP_PORT || 587),
      secure:
        cfg.secure === true ||
        cfg.secure === "true" ||
        process.env.SMTP_SECURE === "true",
      auth: user || pass ? { user, pass } : undefined,
    });
    await transport.sendMail({
      from: fromAddress(cfg.from),
      to: input.email,
      subject: input.subject,
      html: input.html,
      text,
    });
    return { ok: true };
  } catch (error: any) {
    console.error("[email] send failed:", error?.message || error);
    return { ok: false, error: error?.message || "send failed" };
  }
}
