import type { Role } from '@/types/models'

const SESSION_SCOPE_KEY = 'catequesis-session-scope'

export type SessionScope = {
  userId: string
  parishId: string
  role: Role
}

export function setSessionScope(scope: SessionScope) {
  localStorage.setItem(SESSION_SCOPE_KEY, JSON.stringify(scope))
}

export function getSessionScope() {
  const stored = localStorage.getItem(SESSION_SCOPE_KEY)

  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as SessionScope
  } catch {
    localStorage.removeItem(SESSION_SCOPE_KEY)
    return null
  }
}

export function clearSessionScope() {
  localStorage.removeItem(SESSION_SCOPE_KEY)
}
