/**
 * Backwards-compatible email entrypoint.
 *
 * Email is now provider-agnostic (Resend / SMTP / none). This file keeps the
 * historical `sendEmail` import path working while delegating to the adapter in
 * `lib/providers/email`. New code should import from there directly.
 */
export { sendEmail, isEmailEnabled, getEmailProvider } from "@/lib/providers/email";
