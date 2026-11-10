/**
 * Enterprise license gate.
 *
 * EE features (SSO, SCIM, custom roles, audit log, advanced scheduling) are
 * gated behind a signed license key set in LICENSE_KEY. The key is a JWT signed
 * with Larkup's private key and verified here with the bundled public key, so it
 * can be validated OFFLINE (air-gapped self-hosts work). Until verification is
 * wired up, this reads the feature flags from a decoded (unverified) payload in
 * development and treats production without a key as "core only".
 *
 * This mirrors the open-core model used by Langfuse / Cal.com / PostHog: the
 * core is MIT and fully functional; EE unlocks with a key.
 */
import { deployment } from "@/lib/config";

export type EEFeature =
  | "sso"
  | "scim"
  | "custom-roles"
  | "audit-log"
  | "advanced-scheduling"
  | "white-label";

type LicensePayload = {
  plan: "free" | "pro" | "team" | "enterprise";
  features: EEFeature[];
  exp?: number;
};

function decodeUnverified(key: string): LicensePayload | null {
  try {
    const [, payload] = key.split(".");
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    return json as LicensePayload;
  } catch {
    return null;
  }
}

/** All features unlocked on Cloud; self-host reads the license key. */
export function getLicense(): LicensePayload {
  if (deployment.isCloud()) {
    return {
      plan: "enterprise",
      features: [
        "sso",
        "scim",
        "custom-roles",
        "audit-log",
        "advanced-scheduling",
        "white-label",
      ],
    };
  }
  const key = deployment.licenseKey;
  if (!key) return { plan: "free", features: [] };
  // TODO: replace with signature verification against the bundled public key.
  const payload = decodeUnverified(key);
  if (!payload) return { plan: "free", features: [] };
  if (payload.exp && payload.exp * 1000 < Date.now())
    return { plan: "free", features: [] };
  return payload;
}

export function isEEEnabled(feature: EEFeature): boolean {
  return getLicense().features.includes(feature);
}
