import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  jsonb,
  real,
  index,
} from "drizzle-orm/pg-core";

/* ----------------------------- Better Auth tables ----------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // 'full_admin', 'admin', 'user'
  vercelAiGatewayKey: text("vercelAiGatewayKey"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  token: text("token").notNull().unique(),
  invitedBy: text("invitedBy").references(() => user.id, { onDelete: "set null" }),
  // Which workspace the invite is for (null = legacy/global invite).
  workspaceId: text("workspaceId").references(() => workspace.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/* -------------------------------- Workspaces -------------------------------- */

/**
 * A workspace is the unit of multi-tenancy: posts, settings and members all
 * belong to a workspace. This is MIT-core (basic multi-tenancy); advanced
 * governance (unlimited workspaces, custom roles/RBAC, SSO, SCIM, audit log)
 * is gated by the EE license — see `ee/license.ts`.
 */
export const workspace = pgTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdBy: text("createdBy").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("workspace_slug_idx").on(table.slug)],
);

export type Workspace = typeof workspace.$inferSelect;

/** Membership join table: a user belongs to a workspace with a role. */
export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // 'owner' | 'admin' | 'member'. Custom roles are an EE feature.
    role: text("role").notNull().default("member"),
    // Optional EE custom role (overrides the fixed `role` for permissions).
    // References `role.id`; null means use the fixed role above. EE-only.
    customRoleId: text("customRoleId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("workspace_member_workspace_idx").on(table.workspaceId),
    index("workspace_member_user_idx").on(table.userId),
    index("workspace_member_unique_idx").on(table.workspaceId, table.userId),
  ],
);

export type WorkspaceMember = typeof workspaceMember.$inferSelect;

/* ------------------------------- Runtime config ------------------------------ */

/**
 * Singleton (id = 1) row holding runtime, UI-configurable provider settings
 * written by the first-run setup wizard (`/setup`). Secrets inside the JSON
 * blobs are encrypted at rest with AES-256-GCM (`lib/crypto`). These override
 * environment variables, so an operator can switch storage/email/AI providers
 * from the dashboard without redeploying. Env vars remain the fallback.
 */
export const appConfig = pgTable("app_config", {
  id: integer("id").primaryKey().default(1),
  // Storage: 's3' | 'vercel-blob' | 'uploadthing' | 'local' | null (use env)
  storageProvider: text("storageProvider"),
  storageConfig: jsonb("storageConfig"),
  // Email: 'resend' | 'smtp' | 'none' | null (use env)
  emailProvider: text("emailProvider"),
  emailConfig: jsonb("emailConfig"),
  // Default AI provider id + config (per-user overrides live in `settings`).
  aiProvider: text("aiProvider"),
  aiConfig: jsonb("aiConfig"),
  // Marks the setup wizard as finished.
  setupCompletedAt: timestamp("setupCompletedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AppConfig = typeof appConfig.$inferSelect;

/* --------------------------------- App tables --------------------------------- */

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  // Owning workspace (null = legacy/pre-multi-tenancy post).
  workspaceId: text("workspaceId"),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: jsonb("content"),
  contentHtml: text("contentHtml"),
  coverImage: text("coverImage"),
  showCover: boolean("showCover").notNull().default(false),
  coverSize: text("coverSize").notNull().default("medium"),
  coverFit: text("coverFit").notNull().default("contain"),
  coverZoom: real("coverZoom").default(1),
  coverX: integer("coverX").default(50),
  coverY: integer("coverY").default(50),
  category: text("category"),
  authorName: text("authorName"),
  published: boolean("published").notNull().default(false),
  isMain: boolean("isMain").notNull().default(false),
  showToc: boolean("showToc").notNull().default(true),
  readingTime: integer("readingTime"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;

/**
 * Anonymous page-view events. `visitorId` is a random browser-local ID; it is
 * intentionally not an IP address, email address, or other personal data.
 */
export const postViews = pgTable(
  "post_views",
  {
    id: serial("id").primaryKey(),
    postId: integer("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitorId").notNull(),
    viewedAt: timestamp("viewedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("post_views_post_id_viewed_at_idx").on(table.postId, table.viewedAt),
    index("post_views_viewed_at_idx").on(table.viewedAt),
  ],
);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(), // One settings row per user/workspace
  // Owning workspace (null = legacy/global). Lets settings move to per-workspace.
  workspaceId: text("workspaceId"),
  apiKey: text("apiKey").unique(),
  previewUrl: text("previewUrl"),
  // Provider id from the AI registry: 'vercel'/'gateway', 'openai', 'anthropic',
  // 'google', 'xai', 'deepseek', 'mistral', 'groq', 'openrouter', 'ollama',
  // 'lmstudio', 'custom'. ('vercel' kept for backwards compatibility == gateway.)
  aiProvider: text("aiProvider").notNull().default("gateway"),
  // New multi-provider fields (API key is encrypted at rest via lib/crypto).
  aiModel: text("aiModel"),
  aiApiKey: text("aiApiKey"),
  aiBaseUrl: text("aiBaseUrl"),
  // Legacy custom-provider fields (still read as a fallback).
  customAiUrl: text("customAiUrl"),
  customAiKey: text("customAiKey"),
  customAiModel: text("customAiModel"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Settings = typeof settings.$inferSelect;

/* ============================================================================
 * ENTERPRISE (EE) TABLES
 * ----------------------------------------------------------------------------
 * These tables back the commercial `ee/` features (custom roles / RBAC, SSO,
 * SCIM provisioning, audit log). The tables always exist so the schema is a
 * single migration set, but the features are gated at runtime by
 * `ee/license.ts` `isEEEnabled()`. The MIT core never requires them.
 * Everything is scoped by `workspaceId`.
 * ==========================================================================*/

/**
 * EE custom role: a named set of permission statements scoped to a workspace.
 * The MIT core ships fixed roles (owner/admin/member mapped to
 * Owner/Admin/Editor/Writer/Viewer capabilities in `ee/rbac.ts`); EE lets an
 * operator define additional roles and attach them to members
 * (`workspace_member.customRoleId`).
 */
export const role = pgTable(
  "role",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // Array of permission strings, e.g. ["post:create","post:publish"].
    permissions: jsonb("permissions").notNull().default([]),
    // Built-in roles cannot be deleted/edited from the UI.
    isSystem: boolean("isSystem").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("role_workspace_idx").on(table.workspaceId)],
);

export type Role = typeof role.$inferSelect;

/**
 * EE SSO connection (SAML or OIDC) for a workspace. Secrets inside `config`
 * (client secret, SAML cert/private key) are encrypted at rest via `lib/crypto`
 * and never returned to the browser. `domain` enables domain-based routing
 * ("users @acme.com sign in via this connection").
 */
export const ssoConnection = pgTable(
  "sso_connection",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // 'oidc' | 'saml'
    type: text("type").notNull(),
    // Human label, e.g. "Okta", "Azure AD".
    label: text("label").notNull(),
    // Email domain that routes to this connection (lowercase, no @).
    domain: text("domain"),
    issuer: text("issuer"),
    // Encrypted JSON: { clientId, clientSecret, authorizationUrl, tokenUrl,
    // userinfoUrl, jwksUrl } for OIDC; { entryPoint, cert, ... } for SAML.
    config: jsonb("config").notNull().default({}),
    enabled: boolean("enabled").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("sso_connection_workspace_idx").on(table.workspaceId),
    index("sso_connection_domain_idx").on(table.domain),
  ],
);

export type SsoConnection = typeof ssoConnection.$inferSelect;

/**
 * EE SCIM provisioning token. The raw token is shown once at creation; only a
 * SHA-256 hash is stored. Used as a Bearer token on `/api/scim/v2/*` so an IdP
 * (Okta, Azure AD) can create/deactivate users in a workspace automatically.
 */
export const scimToken = pgTable(
  "scim_token",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // SHA-256 hex of the raw bearer token. Never store the token itself.
    tokenHash: text("tokenHash").notNull().unique(),
    lastUsedAt: timestamp("lastUsedAt"),
    createdBy: text("createdBy").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("scim_token_workspace_idx").on(table.workspaceId)],
);

export type ScimToken = typeof scimToken.$inferSelect;

/**
 * EE audit log: an append-only record of who did what, when. Secrets are never
 * written here. `metadata` holds non-sensitive context (changed fields, ids).
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspaceId"),
    actorId: text("actorId"),
    actorEmail: text("actorEmail"),
    // Dotted action name, e.g. "post.publish", "member.role.update".
    action: text("action").notNull(),
    targetType: text("targetType"),
    targetId: text("targetId"),
    metadata: jsonb("metadata"),
    ip: text("ip"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("audit_log_action_idx").on(table.action),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;

/* ============================================================================
 * SCHEDULED AUTO-GENERATION (cron) — MIT CORE
 * ----------------------------------------------------------------------------
 * `schedule` rows describe recurring AI post generation; `job` rows record each
 * run. Basic scheduling is MIT core; advanced scheduling (many schedules per
 * workspace, auto-publish) is gated by the EE `advanced-scheduling` flag.
 * Scoped by `workspaceId`.
 * ==========================================================================*/

export const schedule = pgTable(
  "schedule",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Standard 5-field cron expression, interpreted in `timezone`.
    cron: text("cron").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    // The brief the generator is given. One of the topics (if any) is appended.
    prompt: text("prompt").notNull(),
    // Optional rotating topic pool (jsonb array of strings).
    topics: jsonb("topics").notNull().default([]),
    // Index into `topics` for round-robin selection.
    topicCursor: integer("topicCursor").notNull().default(0),
    // Optional model override (provider/model id); null uses workspace default.
    model: text("model"),
    // 'short' | 'medium' | 'long' | a custom word count hint.
    length: text("length").notNull().default("medium"),
    category: text("category"),
    // Draft (for review) vs publish immediately. Auto-publish is EE-gated.
    autoPublish: boolean("autoPublish").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("lastRunAt", { withTimezone: true }),
    nextRunAt: timestamp("nextRunAt", { withTimezone: true }),
    createdBy: text("createdBy").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("schedule_workspace_idx").on(table.workspaceId),
    index("schedule_next_run_idx").on(table.enabled, table.nextRunAt),
  ],
);

export type Schedule = typeof schedule.$inferSelect;

export const job = pgTable(
  "job",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId").notNull(),
    scheduleId: text("scheduleId").references(() => schedule.id, {
      onDelete: "set null",
    }),
    // 'pending' | 'running' | 'success' | 'error'
    status: text("status").notNull().default("pending"),
    log: text("log"),
    postId: integer("postId"),
    startedAt: timestamp("startedAt", { withTimezone: true }),
    finishedAt: timestamp("finishedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("job_workspace_idx").on(table.workspaceId),
    index("job_schedule_idx").on(table.scheduleId),
  ],
);

export type Job = typeof job.$inferSelect;

/* ------------------------------- API keys (v2) ---------------------------- */
/**
 * Workspace-scoped SDK/API keys. Two kinds:
 *  - `publishable` (`pk_…`): read **published** content only, safe in a browser.
 *  - `secret` (`sk_…`): can read drafts (`?preview=true`) and (future) write.
 * Only a SHA-256 hash of the key is stored — the plaintext is shown once at
 * creation. Legacy single keys in `settings.apiKey` keep working (treated as
 * secret) until rotated; see `lib/api-keys.ts`.
 */
export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // The content owner whose posts this key serves (kept = settings.userId so
    // behaviour matches the legacy single-key API).
    userId: text("userId").notNull(),
    name: text("name").notNull().default("API key"),
    // 'publishable' | 'secret'
    type: text("type").notNull(),
    // Non-secret prefix shown in the UI, e.g. "pk_live_a1b2c3".
    prefix: text("prefix").notNull(),
    // SHA-256 hex of the full key. Unique so lookups are O(1).
    keyHash: text("keyHash").notNull().unique(),
    lastFour: text("lastFour").notNull(),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("lastUsedAt", { withTimezone: true }),
    revokedAt: timestamp("revokedAt", { withTimezone: true }),
  },
  (table) => [
    index("api_key_workspace_idx").on(table.workspaceId),
    index("api_key_hash_idx").on(table.keyHash),
  ],
);

export type ApiKey = typeof apiKey.$inferSelect;

/* ------------------------------- Cloud: billing -------------------------- */
/**
 * One subscription row per workspace (cloud only). `plan` drives limits
 * (`lib/plans.ts`); the provider fields link to Stripe/Polar. Self-host never
 * writes here — it runs unlimited.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("free"),
    // 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
    status: text("status").notNull().default("active"),
    provider: text("provider"), // 'stripe' | 'polar'
    customerId: text("customerId"),
    subscriptionId: text("subscriptionId"),
    priceId: text("priceId"),
    seats: integer("seats").notNull().default(1),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
    currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscription_workspace_idx").on(table.workspaceId),
    index("subscription_customer_idx").on(table.customerId),
  ],
);

export type Subscription = typeof subscription.$inferSelect;

/* ------------------------------- Cloud: usage ---------------------------- */
/**
 * Monthly usage counters per workspace + metric (cloud only). `period` is
 * `YYYY-MM` (UTC). Enforced against `lib/plans.ts` limits.
 */
export const usageCounter = pgTable(
  "usage_counter",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // 'posts' | 'ai_tokens' | 'storage_bytes' | 'api_requests'
    metric: text("metric").notNull(),
    period: text("period").notNull(), // YYYY-MM for monthly metrics, 'total' for cumulative
    value: integer("value").notNull().default(0),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("usage_counter_lookup_idx").on(
      table.workspaceId,
      table.metric,
      table.period,
    ),
  ],
);

export type UsageCounter = typeof usageCounter.$inferSelect;

/* ---------------------------- Cloud: custom domains ---------------------- */
/**
 * A custom domain mapped to a workspace's hosted blog (cloud/no-code).
 * Verified by a DNS TXT record; on cloud the domain is also registered with
 * the Vercel Domains API.
 */
export const customDomain = pgTable(
  "custom_domain",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    verified: boolean("verified").notNull().default(false),
    verificationToken: text("verificationToken").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verifiedAt", { withTimezone: true }),
  },
  (table) => [index("custom_domain_workspace_idx").on(table.workspaceId)],
);

export type CustomDomain = typeof customDomain.$inferSelect;
