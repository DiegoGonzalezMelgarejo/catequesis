import { DEFAULT_PARISH_ID, type SyncStatus } from '@/types/models'
import { getSessionScope } from '@/services/session-service'

export function createId() {
  return crypto.randomUUID()
}

export function createLocalMeta(existingCreatedAt?: string, syncStatus: SyncStatus = 'synced', parishId?: string) {
  const timestamp = new Date().toISOString()
  const sessionScope = getSessionScope()

  return {
    parishId: parishId ?? sessionScope?.parishId ?? DEFAULT_PARISH_ID,
    syncStatus,
    createdAt: existingCreatedAt ?? timestamp,
    updatedAt: timestamp,
  }
}
