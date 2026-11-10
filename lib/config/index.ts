/**
 * Central product / branding configuration.
 *
 * Everything that used to be hardcoded to "Larkup" lives here and is driven by
 * environment variables, so the same codebase can be rebranded by a self-hoster
 * or deployed as Larkup without touching source. This is the single source of
 * truth for the app name, logo, URLs and deployment mode.
 */

function env(key: string, fallback = ""): string {
  return (process.env[key] ?? fallback).trim();
}

export type DeploymentMode = "selfhost" | "cloud";

export const brand = {
  /** Product name shown in the UI, emails and <title>. */
  name: env("NEXT_PUBLIC_APP_NAME", "Lark Blog Studio"),
  /** Short name for compact spots (sidebar, mobile). */
  shortName: env("NEXT_PUBLIC_APP_SHORT_NAME", "Lark"),
  /** Tagline / meta description. */
  description: env(
    "NEXT_PUBLIC_APP_DESCRIPTION",
    "The open-source, AI-native blog CMS. Write, schedule and ship content anywhere."
  ),
  /** Logo path (served from /public) or absolute URL. */
  logo: env("NEXT_PUBLIC_APP_LOGO", "/logo.png"),
  /** Marketing / docs site. */
  website: env("NEXT_PUBLIC_APP_WEBSITE", "https://github.com/Larkup-AI/lark-blog"),
  docsUrl: env("NEXT_PUBLIC_DOCS_URL", "https://docs.lark.blog"),
} as const;

/**
 * Public base URL of this deployment. Used for auth callbacks, invite links,
 * presigned redirects and trusted origins. Order of precedence lets Vercel work
 * out of the box while allowing an explicit override.
 */
export function getBaseUrl(): string {
  const explicit = env("APP_URL") || env("BETTER_AUTH_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const deployment = {
  mode: (env("DEPLOYMENT_MODE", "selfhost") as DeploymentMode) || "selfhost",
  /** Disable open sign-up (self-host single-tenant). Cloud leaves this false. */
  disableSignup: env("DISABLE_SIGNUP") === "true",
  /** Signed license key that unlocks /ee features. */
  licenseKey: env("LICENSE_KEY"),
  isCloud(): boolean {
    return this.mode === "cloud";
  },
} as const;

export function trustedOrigins(): string[] {
  const origins = new Set<string>([
    getBaseUrl(),
    "http://localhost:3000",
    "https://localhost:3000",
  ]);
  for (const extra of env("TRUSTED_ORIGINS").split(",")) {
    const o = extra.trim();
    if (o) origins.add(o.replace(/\/$/, ""));
  }
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return [...origins];
}
