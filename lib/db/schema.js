"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.posts = exports.invitation = exports.verification = exports.account = exports.session = exports.user = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
/* ----------------------------- Better Auth tables ----------------------------- */
exports.user = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)("emailVerified").notNull().default(false),
    image: (0, pg_core_1.text)("image"),
    role: (0, pg_core_1.text)("role").notNull().default("user"), // 'full_admin', 'admin', 'user'
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
exports.session = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    expiresAt: (0, pg_core_1.timestamp)("expiresAt").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
    ipAddress: (0, pg_core_1.text)("ipAddress"),
    userAgent: (0, pg_core_1.text)("userAgent"),
    userId: (0, pg_core_1.text)("userId")
        .notNull()
        .references(function () { return exports.user.id; }, { onDelete: "cascade" }),
});
exports.account = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    accountId: (0, pg_core_1.text)("accountId").notNull(),
    providerId: (0, pg_core_1.text)("providerId").notNull(),
    userId: (0, pg_core_1.text)("userId")
        .notNull()
        .references(function () { return exports.user.id; }, { onDelete: "cascade" }),
    accessToken: (0, pg_core_1.text)("accessToken"),
    refreshToken: (0, pg_core_1.text)("refreshToken"),
    idToken: (0, pg_core_1.text)("idToken"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("accessTokenExpiresAt"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refreshTokenExpiresAt"),
    scope: (0, pg_core_1.text)("scope"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
exports.verification = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expiresAt").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow(),
});
exports.invitation = (0, pg_core_1.pgTable)("invitation", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    email: (0, pg_core_1.text)("email").notNull(),
    role: (0, pg_core_1.text)("role").notNull().default("user"),
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
    token: (0, pg_core_1.text)("token").notNull().unique(),
    invitedBy: (0, pg_core_1.text)("invitedBy").references(function () { return exports.user.id; }, { onDelete: "set null" }),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
/* --------------------------------- App tables --------------------------------- */
exports.posts = (0, pg_core_1.pgTable)("posts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.text)("userId").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull().unique(),
    content: (0, pg_core_1.jsonb)("content"),
    contentHtml: (0, pg_core_1.text)("contentHtml"),
    coverImage: (0, pg_core_1.text)("coverImage"),
    showCover: (0, pg_core_1.boolean)("showCover").notNull().default(false),
    coverSize: (0, pg_core_1.text)("coverSize").notNull().default("medium"),
    category: (0, pg_core_1.text)("category"),
    authorName: (0, pg_core_1.text)("authorName"),
    published: (0, pg_core_1.boolean)("published").notNull().default(false),
    showToc: (0, pg_core_1.boolean)("showToc").notNull().default(true),
    readingTime: (0, pg_core_1.integer)("readingTime"),
    publishedAt: (0, pg_core_1.timestamp)("publishedAt"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
exports.settings = (0, pg_core_1.pgTable)("settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.text)("userId").notNull().unique(), // One settings row per user/workspace
    apiKey: (0, pg_core_1.text)("apiKey").unique(),
    previewUrl: (0, pg_core_1.text)("previewUrl"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
