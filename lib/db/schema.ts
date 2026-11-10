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
