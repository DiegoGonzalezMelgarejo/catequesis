import { getDocumentById, getDocumentsByField, putDocument } from '@/database/firestore-repository'
import { clearSessionScope, setSessionScope } from '@/services/session-service'
import type { User } from '@/types/models'
import { hashPassword, verifyPassword } from '@/utils/password'

const SESSION_KEY = 'catequesis-session-user-id'

export async function loginUser(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase()
  const users = await getDocumentsByField<User>('users', 'username', normalizedUsername)
  const user = users[0]

  if (!user || !user.active || !(await verifyPassword(password, user.id, user.password))) {
    return null
  }

  if (!user.password.startsWith('sha256:')) {
    user.password = await hashPassword(password, user.id)
    user.updatedAt = new Date().toISOString()
    await putDocument('users', user)
  }

  localStorage.setItem(SESSION_KEY, user.id)
  setSessionScope({ userId: user.id, parishId: user.parishId, role: user.role })
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
    clearSessionScope()
    return null
  }

  setSessionScope({ userId: user.id, parishId: user.parishId, role: user.role })

  return user
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  clearSessionScope()
}

export async function syncSessionUser(userId: string) {
  const user = await getDocumentById<User>('users', userId)

  if (!user || !user.active) {
    clearSession()
    return null
  }

  setSessionScope({ userId: user.id, parishId: user.parishId, role: user.role })

  return user satisfies User
}

export async function updateUserPassword(userId: string, nextPassword: string) {
  const user = await getDocumentById<User>('users', userId)

  if (!user || !user.active) {
    throw new Error('Usuario no disponible para cambiar la contraseña.')
  }

  const updatedUser: User = {
    ...user,
    password: await hashPassword(nextPassword, user.id),
    mustChangePassword: false,
    passwordUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await putDocument('users', updatedUser)
  setSessionScope({ userId: updatedUser.id, parishId: updatedUser.parishId, role: updatedUser.role })

  return updatedUser
}
