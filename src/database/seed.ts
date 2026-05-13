import { getSetting, listDocuments, putDocument, setSetting } from '@/database/firestore-repository'
import {
  DEFAULT_PARISH_ID,
  DEFAULT_SEED_VERSION,
  PLATFORM_PARISH_ID,
  type Parish,
  type Setting,
  type User,
} from '@/types/models'
import { ensureDefaultParishExists } from '@/services/parish-service'
import { hashPassword } from '@/utils/password'
import { buildSearchTokens } from '@/utils/search'

let databaseInitializationPromise: Promise<void> | null = null
let databaseAuthReadyPromise: Promise<void> | null = null

function createTimestamp() {
  return new Date().toISOString()
}

async function ensureBaseSeedData() {
  const seedSetting = await getSetting('seed-version')
  const timestamp = createTimestamp()
  const existingParishes = await listDocuments<Parish>('parishes')

  if (!existingParishes.some((parish) => parish.id === DEFAULT_PARISH_ID)) {
    await putDocument('parishes', {
      id: DEFAULT_PARISH_ID,
      name: 'Parroquia Central',
      city: 'Local',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Parish)
  }

  await ensureDefaultParishExists()

  const superAdminUser: User = {
    id: 'seed-super-admin',
    fullName: 'Super administrador',
    username: 'superadmin',
    password: await hashPassword('superadmin123', 'seed-super-admin'),
    role: 'SUPER_ADMIN',
    active: true,
    mustChangePassword: true,
    passwordUpdatedAt: timestamp,
    searchTokens: buildSearchTokens('Super administrador', 'superadmin'),
    parishId: PLATFORM_PARISH_ID,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const adminUser: User = {
    id: 'seed-admin',
    fullName: 'Administrador principal',
    username: 'admin',
    password: await hashPassword('admin123', 'seed-admin'),
    role: 'ADMIN',
    active: true,
    mustChangePassword: true,
    passwordUpdatedAt: timestamp,
    searchTokens: buildSearchTokens('Administrador principal', 'admin'),
    parishId: DEFAULT_PARISH_ID,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const setting: Setting = {
    key: 'seed-version',
    value: DEFAULT_SEED_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const existingUsers = await listDocuments<User>('users')
  const existingAdmin = existingUsers.find((user) => user.username.trim().toLowerCase() === 'admin')
  const existingSuperAdmin = existingUsers.find((user) => user.username.trim().toLowerCase() === 'superadmin')

  if (!existingAdmin || seedSetting?.value !== DEFAULT_SEED_VERSION) {
    await putDocument('users', adminUser)
  }

  if (!existingSuperAdmin || seedSetting?.value !== DEFAULT_SEED_VERSION) {
    await putDocument('users', superAdminUser)
  }

  await setSetting(setting)
}

export async function initializeDatabase() {
  await ensureDatabaseAuthReady()
}

export function ensureDatabaseAuthReady() {
  if (!databaseAuthReadyPromise) {
    databaseAuthReadyPromise = ensureBaseSeedData()
  }

  return databaseAuthReadyPromise
}

export function ensureDatabaseInitialized() {
  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase()
  }

  return databaseInitializationPromise
}
