import { listDocuments, putDocument, putDocuments } from '@/database/firestore-repository'
import { getSessionScope } from '@/services/session-service'
import { notifyDataChanged } from '@/store/data-store'
import {
  DEFAULT_PARISH_ID,
  SACRAMENT_NAMES,
  type SacramentName,
  type ChecklistCatalogItem,
  type DocumentRequirement,
  type Parish,
  type Sacrament,
  type User,
} from '@/types/models'
import { createId, createLocalMeta } from '@/utils/entity'
import { generateTemporaryPassword, hashPassword } from '@/utils/password'
import { buildSearchTokens } from '@/utils/search'

const DEFAULT_CHECKLIST_CATALOG_ITEMS: Array<{ label: string; sacramentNames: SacramentName[] }> = []
const DEFAULT_DOCUMENT_REQUIREMENTS: Array<{ label: string; sacramentNames: SacramentName[] }> = []

function normalizeCatalogId(value: string) {
  return value.toLowerCase().replaceAll(' ', '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export type ParishInput = {
  name: string
  city?: string
  adminFullName: string
  adminUsername: string
  adminPassword?: string
}

export type ParishOverview = Parish & {
  adminName?: string
  adminUsername?: string
}

export async function ensureParishBaseCatalog(parishId: string) {
  const [existingSacraments, existingChecklistCatalog, existingDocumentRequirements] = await Promise.all([
    listDocuments<Sacrament>('sacraments'),
    listDocuments<ChecklistCatalogItem>('checklistCatalog'),
    listDocuments<DocumentRequirement>('documentRequirements'),
  ])

  const timestamp = new Date().toISOString()
  let sacramentMap = new Map(
    existingSacraments
      .filter((sacrament) => sacrament.parishId === parishId)
      .map((sacrament) => [sacrament.name, sacrament.id]),
  )

  if (sacramentMap.size === 0) {
    const parishSacraments = SACRAMENT_NAMES.map((name) => ({
      id: `sacrament-${parishId}-${normalizeCatalogId(name)}`,
      name,
      active: true,
      parishId,
      syncStatus: 'synced' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))

    await putDocuments('sacraments', parishSacraments)
    sacramentMap = new Map(parishSacraments.map((sacrament) => [sacrament.name, sacrament.id]))
  }

  if (!existingChecklistCatalog.some((item) => item.parishId === parishId) && DEFAULT_CHECKLIST_CATALOG_ITEMS.length > 0) {
    await putDocuments(
      'checklistCatalog',
      DEFAULT_CHECKLIST_CATALOG_ITEMS.map((item) => ({
        id: `checklist-${parishId}-${normalizeCatalogId(item.label)}`,
        label: item.label,
        sacramentIds: item.sacramentNames.map((name) => sacramentMap.get(name)).filter(Boolean) as string[],
        parishId,
        syncStatus: 'synced' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    )
  }

  if (!existingDocumentRequirements.some((item) => item.parishId === parishId) && DEFAULT_DOCUMENT_REQUIREMENTS.length > 0) {
    await putDocuments(
      'documentRequirements',
      DEFAULT_DOCUMENT_REQUIREMENTS.map((item) => ({
        id: `document-${parishId}-${normalizeCatalogId(item.label)}`,
        label: item.label,
        sacramentIds: item.sacramentNames.map((name) => sacramentMap.get(name)).filter(Boolean) as string[],
        parishId,
        syncStatus: 'synced' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    )
  }
}

export async function getParishOverviews() {
  const [parishes, users] = await Promise.all([
    listDocuments<Parish>('parishes'),
    listDocuments<User>('users'),
  ])

  return parishes
    .map((parish) => {
      const admin = users.find((user) => user.parishId === parish.id && user.role === 'ADMIN' && user.active)

      return {
        ...parish,
        adminName: admin?.fullName,
        adminUsername: admin?.username,
      } satisfies ParishOverview
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
}

export async function createParishWithAdmin(input: ParishInput) {
  const sessionScope = getSessionScope()

  if (sessionScope?.role !== 'SUPER_ADMIN') {
    throw new Error('Solo un super administrador puede crear parroquias.')
  }

  const parishes = await listDocuments<Parish>('parishes')
  const users = await listDocuments<User>('users')
  const normalizedUsername = input.adminUsername.trim().toLowerCase()

  if (parishes.some((parish) => parish.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error('Ya existe una parroquia con ese nombre.')
  }

  if (users.some((user) => user.username.trim().toLowerCase() === normalizedUsername)) {
    throw new Error('El usuario administrador ya existe.')
  }

  const parishId = createId()
  const adminId = createId()
  const adminPassword = input.adminPassword?.trim() || generateTemporaryPassword()
  const temporaryPassword = input.adminPassword?.trim() ? undefined : adminPassword
  const parish: Parish = {
    id: parishId,
    name: input.name.trim(),
    city: input.city?.trim(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const admin: User = {
    id: adminId,
    fullName: input.adminFullName.trim(),
    username: normalizedUsername,
    password: await hashPassword(adminPassword, adminId),
    role: 'ADMIN',
    phone: undefined,
    email: undefined,
    active: true,
    mustChangePassword: true,
    passwordUpdatedAt: new Date().toISOString(),
    searchTokens: buildSearchTokens(input.adminFullName, normalizedUsername),
    ...createLocalMeta(undefined, 'synced', parishId),
  }

  await putDocument('parishes', parish)
  await putDocument('users', admin)
  await ensureParishBaseCatalog(parishId)
  notifyDataChanged()

  return { parish, admin, temporaryPassword }
}

export async function ensureDefaultParishExists() {
  const parishes = await listDocuments<Parish>('parishes')

  if (parishes.some((parish) => parish.id === DEFAULT_PARISH_ID)) {
    return
  }

  const timestamp = new Date().toISOString()

  await putDocument('parishes', {
    id: DEFAULT_PARISH_ID,
    name: 'Parroquia Central',
    city: 'Local',
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Parish)
}
