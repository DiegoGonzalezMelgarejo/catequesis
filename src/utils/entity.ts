import { DEFAULT_PARISH_ID, type SyncStatus } from '@/types/models'

export function createId() {
  return crypto.randomUUID()
}

export function createLocalMeta(existingCreatedAt?: string, syncStatus: SyncStatus = 'synced') {
  const timestamp = new Date().toISOString()

  return {
    parishId: DEFAULT_PARISH_ID,
    syncStatus,
    createdAt: existingCreatedAt ?? timestamp,
    updatedAt: timestamp,
  }
}
