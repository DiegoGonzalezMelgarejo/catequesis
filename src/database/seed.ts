import { getSetting, listDocuments, putDocument, putDocuments, setSetting } from '@/database/firestore-repository'
import {
  DEFAULT_PARISH_ID,
  DEFAULT_SEED_VERSION,
  PLATFORM_PARISH_ID,
  type Group,
  type Parish,
  type Setting,
  type Student,
  type User,
} from '@/types/models'
import { ensureDefaultParishExists, ensureParishBaseCatalog } from '@/services/parish-service'
import { hashPassword } from '@/utils/password'
import { buildSearchTokens } from '@/utils/search'
import { getCurrentYear } from '@/utils/year'

const SEARCH_INDEX_VERSION = '3'
let databaseInitializationPromise: Promise<void> | null = null

function createTimestamp() {
  return new Date().toISOString()
}

export async function initializeDatabase() {
  const seedSetting = await getSetting('seed-version')
  const searchIndexSetting = await getSetting('search-index-version')

  const timestamp = createTimestamp()
  const currentYear = getCurrentYear()

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

  const [existingUsers, existingParishes] = await Promise.all([
    listDocuments<User>('users'),
    listDocuments<Parish>('parishes'),
  ])

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

  const existingAdmin = existingUsers.find(
    (user) => user.username.trim().toLowerCase() === 'admin',
  )
  const existingSuperAdmin = existingUsers.find(
    (user) => user.username.trim().toLowerCase() === 'superadmin',
  )

  if (!existingAdmin || seedSetting?.value !== DEFAULT_SEED_VERSION) {
    await putDocument('users', adminUser)
  }

  if (!existingSuperAdmin || seedSetting?.value !== DEFAULT_SEED_VERSION) {
    await putDocument('users', superAdminUser)
  }

  await ensureParishBaseCatalog(DEFAULT_PARISH_ID)

  await setSetting(setting)

  if (searchIndexSetting?.value !== SEARCH_INDEX_VERSION) {
    const [users, groups, students] = await Promise.all([
      listDocuments<User>('users'),
      listDocuments<Group>('groups'),
      listDocuments<Student>('students'),
    ])

    await Promise.all([
      putDocuments(
        'users',
        users.map((user) => ({
          ...user,
          searchTokens: buildSearchTokens(user.fullName, user.username, user.email),
        })),
      ),
      putDocuments(
        'groups',
        groups.map((group) => ({
          ...group,
          year: group.year ?? currentYear,
          searchTokens: buildSearchTokens(group.name, (group.year ?? currentYear).toString(), group.description, group.schedule),
        })),
      ),
      putDocuments(
        'students',
        students.map((student) => ({
          ...student,
          year: student.year ?? groups.find((group) => group.id === student.groupId)?.year ?? currentYear,
          searchTokens: buildSearchTokens(
            `${student.firstName} ${student.lastName}`,
            student.firstName,
            student.lastName,
            (student.year ?? groups.find((group) => group.id === student.groupId)?.year ?? currentYear).toString(),
            student.observations,
          ),
        })),
      ),
    ])

    await setSetting({
      key: 'search-index-version',
      value: SEARCH_INDEX_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
}

export function ensureDatabaseInitialized() {
  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase()
  }

  return databaseInitializationPromise
}
