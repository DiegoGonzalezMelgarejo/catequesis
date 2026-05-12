import {
  deleteDocuments,
  getDocumentById,
  listDocuments,
  putDocument,
  putDocuments,
} from '@/database/firestore-repository'
import { canAccessStudent } from '@/services/access-service'
import { notifyDataChanged } from '@/store/data-store'
import type {
  ChecklistCatalogItem,
  Sacrament,
  Student,
  StudentChecklistProgress,
  StudentSacrament,
  User,
} from '@/types/models'
import { createId, createLocalMeta } from '@/utils/entity'

export type ChecklistCatalogEntry = {
  id: string
  label: string
  sacramentIds: string[]
}

export type ChecklistCatalogData = {
  sacraments: Array<{ id: string; name: string }>
  items: ChecklistCatalogEntry[]
}

export type StudentChecklistItem = {
  id: string
  label: string
  checked: boolean
  sacramentNames: string[]
}

export type StudentChecklistData = {
  items: StudentChecklistItem[]
  checkedCount: number
  totalCount: number
  progressPercent: number
}

export async function getChecklistCatalog() {
  const [sacraments, items] = await Promise.all([
    listDocuments<Sacrament>('sacraments'),
    listDocuments<ChecklistCatalogItem>('checklistCatalog'),
  ])

  return {
    sacraments: sacraments
      .filter((sacrament) => sacrament.active)
      .map((sacrament) => ({ id: sacrament.id, name: sacrament.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    items: items
      .map((item) => ({ id: item.id, label: item.label, sacramentIds: item.sacramentIds }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es')),
  } satisfies ChecklistCatalogData
}

export async function saveChecklistCatalog(user: User, items: ChecklistCatalogEntry[]) {
  if (user.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede actualizar este checklist.')
  }

  const existingItems = await listDocuments<ChecklistCatalogItem>('checklistCatalog')
  await deleteDocuments('checklistCatalog', existingItems.map((item) => item.id))

  const cleanedItems = items
    .map((item) => ({
      ...item,
      label: item.label.trim(),
      sacramentIds: [...new Set(item.sacramentIds)],
    }))
    .filter((item) => item.label && item.sacramentIds.length > 0)

  await putDocuments(
    'checklistCatalog',
    cleanedItems.map((item) => ({
      id: item.id,
      label: item.label,
      sacramentIds: item.sacramentIds,
      ...createLocalMeta(undefined, 'synced'),
    })),
  )

  notifyDataChanged()
}

export async function getStudentChecklist(user: User, studentId: string) {
  const hasAccess = await canAccessStudent(user, studentId)

  if (!hasAccess) {
    return null
  }

  const [student, studentSacraments, sacraments, catalogItems, progress] = await Promise.all([
    getDocumentById<Student>('students', studentId),
    listDocuments<StudentSacrament>('studentSacraments'),
    listDocuments<Sacrament>('sacraments'),
    listDocuments<ChecklistCatalogItem>('checklistCatalog'),
    getDocumentById<StudentChecklistProgress>('studentChecklistProgress', studentId),
  ])

  if (!student) {
    return null
  }

  const studentSacramentIds = studentSacraments
    .filter((link) => link.studentId === studentId)
    .map((link) => link.sacramentId)
  const sacramentMap = new Map(sacraments.map((sacrament) => [sacrament.id, sacrament.name]))
  const items = catalogItems
    .filter((item) => item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)))
    .map((item) => ({
      id: item.id,
      label: item.label,
      checked: (progress?.checkedItemIds ?? []).includes(item.id),
      sacramentNames: item.sacramentIds
        .filter((sacramentId) => studentSacramentIds.includes(sacramentId))
        .map((sacramentId) => sacramentMap.get(sacramentId) ?? 'Sacramento'),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'es'))

  const checkedCount = items.filter((item) => item.checked).length
  const totalCount = items.length

  return {
    items,
    checkedCount,
    totalCount,
    progressPercent: totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100),
  } satisfies StudentChecklistData
}

export async function saveStudentChecklist(user: User, studentId: string, checkedItemIds: string[]) {
  if (user.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede registrar este checklist.')
  }

  const existingProgress = await getDocumentById<StudentChecklistProgress>('studentChecklistProgress', studentId)

  await putDocument('studentChecklistProgress', {
    id: studentId,
    studentId,
    checkedItemIds: [...new Set(checkedItemIds)],
    ...createLocalMeta(existingProgress?.createdAt, 'synced'),
  })

  notifyDataChanged()
}

export function createChecklistCatalogItem() {
  return {
    id: createId(),
    label: '',
    sacramentIds: [],
  } satisfies ChecklistCatalogEntry
}
