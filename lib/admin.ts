const ADMIN_EMAILS = [
  'idris.dlm@hotmail.com',
  'ilovevideogame2609@gmail.com',
] as const

export const VERIFIED_ADMIN_BADGE_ID = 'admin_badge'

export function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

export function isAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  return ADMIN_EMAILS.includes(normalized as (typeof ADMIN_EMAILS)[number])
}

export function getRoleForEmail(email: string | null | undefined, fallbackRole: string) {
  return isAdminEmail(email) ? 'admin' : fallbackRole
}

export function isAdminRole(role?: string | null) {
  return (role || '').trim().toLowerCase() === 'admin'
}