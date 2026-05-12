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
  DocumentRequirement,
  Sacrament,
  Student,
  StudentDocumentProgress,
  StudentSacrament,
  User,
} from '@/types/models'
import { createId, createLocalMeta } from '@/utils/entity'

export type DocumentRequirementEntry = {
  id: string
  label: string
  sacramentIds: string[]
}

export type DocumentRequirementCatalog = {
  sacraments: Array<{ id: string; name: string }>
  items: DocumentRequirementEntry[]
}

export type StudentDocumentItem = {
  id: string
  label: string
  delivered: boolean
  sacramentNames: string[]
}

export type StudentDocumentData = {
  items: StudentDocumentItem[]
  deliveredCount: number
  totalCount: number
  progressPercent: number
}

export async function getDocumentRequirementCatalog() {
  const [sacraments, items] = await Promise.all([
    listDocuments<Sacrament>('sacraments'),
    listDocuments<DocumentRequirement>('documentRequirements'),
  ])

  return {
    sacraments: sacraments
      .filter((sacrament) => sacrament.active)
      .map((sacrament) => ({ id: sacrament.id, name: sacrament.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    items: items
      .map((item) => ({ id: item.id, label: item.label, sacramentIds: item.sacramentIds }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es')),
  } satisfies DocumentRequirementCatalog
}

export async function saveDocumentRequirementCatalog(user: User, items: DocumentRequirementEntry[]) {
  if (user.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede actualizar estos requisitos.')
  }

  const existingItems = await listDocuments<DocumentRequirement>('documentRequirements')
  await deleteDocuments('documentRequirements', existingItems.map((item) => item.id))

  const cleanedItems = items
    .map((item) => ({
      ...item,
      label: item.label.trim(),
      sacramentIds: [...new Set(item.sacramentIds)],
    }))
    .filter((item) => item.label && item.sacramentIds.length > 0)

  await putDocuments(
    'documentRequirements',
    cleanedItems.map((item) => ({
      id: item.id,
      label: item.label,
      sacramentIds: item.sacramentIds,
      ...createLocalMeta(undefined, 'synced'),
    })),
  )

  notifyDataChanged()
}

export async function getStudentDocumentRequirements(user: User, studentId: string) {
  const hasAccess = await canAccessStudent(user, studentId)

  if (!hasAccess) {
    return null
  }

  const [student, studentSacraments, sacraments, requirements, progress] = await Promise.all([
    getDocumentById<Student>('students', studentId),
    listDocuments<StudentSacrament>('studentSacraments'),
    listDocuments<Sacrament>('sacraments'),
    listDocuments<DocumentRequirement>('documentRequirements'),
    getDocumentById<StudentDocumentProgress>('studentDocumentProgress', studentId),
  ])

  if (!student) {
    return null
  }

  const studentSacramentIds = studentSacraments
    .filter((link) => link.studentId === studentId)
    .map((link) => link.sacramentId)
  const sacramentMap = new Map(sacraments.map((sacrament) => [sacrament.id, sacrament.name]))
  const items = requirements
    .filter((item) => item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)))
    .map((item) => ({
      id: item.id,
      label: item.label,
      delivered: (progress?.deliveredRequirementIds ?? []).includes(item.id),
      sacramentNames: item.sacramentIds
        .filter((sacramentId) => studentSacramentIds.includes(sacramentId))
        .map((sacramentId) => sacramentMap.get(sacramentId) ?? 'Sacramento'),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'es'))

  const deliveredCount = items.filter((item) => item.delivered).length
  const totalCount = items.length

  return {
    items,
    deliveredCount,
    totalCount,
    progressPercent: totalCount === 0 ? 0 : Math.round((deliveredCount / totalCount) * 100),
  } satisfies StudentDocumentData
}

export async function saveStudentDocumentRequirements(user: User, studentId: string, deliveredRequirementIds: string[]) {
  if (user.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede registrar estos documentos.')
  }

  const existingProgress = await getDocumentById<StudentDocumentProgress>('studentDocumentProgress', studentId)

  await putDocument('studentDocumentProgress', {
    id: studentId,
    studentId,
    deliveredRequirementIds: [...new Set(deliveredRequirementIds)],
    ...createLocalMeta(existingProgress?.createdAt, 'synced'),
  })

  notifyDataChanged()
}

export function createDocumentRequirementItem() {
  return {
    id: createId(),
    label: '',
    sacramentIds: [],
  } satisfies DocumentRequirementEntry
}
