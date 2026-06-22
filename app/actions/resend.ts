import { Resend } from "resend";

export async function sendEmail({
  email,
  subject,
  react,
  html,
  text,
}: {
  email: string;
  subject: string;
  react?: React.ReactNode;
  html?: string;
  text?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const response = await resend.emails.send({
    from: "Larkup Blog Studio <noreply@larkup.de>",
    to: [email],
    subject,
    html,
    react,
    // Always provide plain text fallback — missing text triggers spam filters
    text: text ?? extractTextFromHtml(html),
    headers: {
      // Helps with unsubscribe compliance (Gmail/Yahoo requirement)
      "List-Unsubscribe": "<mailto:unsubscribe@larkup.de>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [{ name: "category", value: "blog_notification" }],
  });

  return response;
}

// Minimal fallback if no text provided
function extractTextFromHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
