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

function fromAddress(): string {
  return process.env.EMAIL_FROM || `${brand.name} <noreply@example.com>`;
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
  const provider = getEmailProvider();
  const text = input.text ?? htmlToText(input.html);

  try {
    if (provider === "none") {
      // No transport configured. Don't throw — callers must handle link flows.
      console.info(`[email:none] suppressed "${input.subject}" → ${input.email}`);
      return { ok: false, skipped: true };
    }

    if (provider === "resend") {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: fromAddress(),
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
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER || process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: fromAddress(),
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
