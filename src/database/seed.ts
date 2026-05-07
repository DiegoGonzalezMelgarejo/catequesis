import { getSetting, listDocuments, putDocument, putDocuments, setSetting } from '@/database/firestore-repository'
import {
  DEFAULT_PARISH_ID,
  DEFAULT_SEED_VERSION,
  SACRAMENT_NAMES,
  type Group,
  type Sacrament,
  type Setting,
  type Student,
  type User,
} from '@/types/models'
import { buildSearchTokens } from '@/utils/search'

const SEARCH_INDEX_VERSION = '1'

function createTimestamp() {
  return new Date().toISOString()
}

export async function initializeDatabase() {
  const seedSetting = await getSetting('seed-version')
  const searchIndexSetting = await getSetting('search-index-version')

  const timestamp = createTimestamp()

  const adminUser: User = {
    id: 'seed-admin',
    fullName: 'Administrador principal',
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    active: true,
    searchTokens: buildSearchTokens('Administrador principal', 'admin'),
    parishId: DEFAULT_PARISH_ID,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const sacraments: Sacrament[] = SACRAMENT_NAMES.map((name) => ({
    id: `sacrament-${name.toLowerCase().replaceAll(' ', '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`,
    name,
    active: true,
    parishId: DEFAULT_PARISH_ID,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  const setting: Setting = {
    key: 'seed-version',
    value: DEFAULT_SEED_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const [existingUsers, existingSacraments] = await Promise.all([
    listDocuments<User>('users'),
    listDocuments<Sacrament>('sacraments'),
  ])

  const existingAdmin = existingUsers.find(
    (user) => user.username.trim().toLowerCase() === 'admin',
  )

  if (!existingAdmin || seedSetting?.value !== DEFAULT_SEED_VERSION) {
    await putDocument('users', adminUser)
  }

  if (existingSacraments.length === 0) {
    await putDocuments('sacraments', sacraments)
  }

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
          searchTokens: buildSearchTokens(group.name, group.description, group.schedule),
        })),
      ),
      putDocuments(
        'students',
        students.map((student) => ({
          ...student,
          searchTokens: buildSearchTokens(
            `${student.firstName} ${student.lastName}`,
            student.firstName,
            student.lastName,
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
