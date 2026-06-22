import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

/**
 * Returns the current session, or null.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Normalize an email for comparison: lowercase, trim, strip wrapping quotes. */
function normalizeEmail(value?: string | null) {
  return value
    ?.trim()
    .replace(/^['"]|['"]$/g, '') // strip surrounding quotes if the env var was quoted
    .toLowerCase()
    .trim()
}

export function isAdminEmail(email?: string | null) {
  const admin = normalizeEmail(process.env.ADMIN_EMAIL)
  const candidate = normalizeEmail(email)
  if (!admin || !candidate) return false
  return candidate === admin
}

export function isFullAdmin(user: { role?: string | null; email?: string | null } | null | undefined) {
  if (!user) return false
  return user.role === 'full_admin' || isAdminEmail(user.email)
}

export function isAdmin(user: { role?: string | null; email?: string | null } | null | undefined) {
  if (!user) return false
  return user.role === 'admin' || isFullAdmin(user)
}

/**
 * Returns the user id if the current session belongs to at least an admin,
 * otherwise null. Used to gate admin server actions and pages.
 */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getSession()
  if (!session?.user) return null
  if (!isAdmin(session.user)) return null
  return session.user.id
}
