import { getDocumentById, listDocuments } from '@/database/firestore-repository'
import type { User } from '@/types/models'

const SESSION_KEY = 'catequesis-session-user-id'

export async function loginUser(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase()
  const users = await listDocuments<User>('users')
  const user = users.find((entry) => entry.username.trim().toLowerCase() === normalizedUsername)

  if (!user || !user.active || user.password !== password) {
    return null
  }

  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

export async function restoreSession() {
  const userId = localStorage.getItem(SESSION_KEY)

  if (!userId) {
    return null
  }

  const user = await getDocumentById<User>('users', userId)

  if (!user || !user.active) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }

  return user
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function syncSessionUser(userId: string) {
  const user = await getDocumentById<User>('users', userId)

  if (!user || !user.active) {
    clearSession()
    return null
  }

  return user satisfies User
}
