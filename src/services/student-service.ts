import {
  deleteDocuments,
  getDocumentsByFieldIn,
  getDocumentsByIds,
  getDocumentById,
  listDocuments,
  paginateDocuments,
  putDocument,
  putDocuments,
} from '@/database/firestore-repository'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { canAccessStudent, getAccessibleGroupIds } from '@/services/access-service'
import { notifyDataChanged } from '@/store/data-store'
import type {
  ActivityType,
  AttendanceStatus,
  ChecklistCatalogItem,
  DocumentRequirement,
  Guardian,
  SacramentName,
  Student,
  StudentChecklistProgress,
  StudentDocumentProgress,
  User,
} from '@/types/models'
import { calculateAge } from '@/utils/date'
import { createId, createLocalMeta } from '@/utils/entity'
import { buildSearchTokens, normalizeSearchText } from '@/utils/search'
import { getCurrentYear } from '@/utils/year'

export type GuardianInput = {
  name: string
  relationship: string
  phone?: string
  whatsapp?: string
  email?: string
  isPrimary: boolean
}

export type StudentInput = {
  id?: string
  firstName: string
  lastName: string
  birthDate?: string
  activeYear?: number
  observations?: string
  groupId: string
  sacramentIds: string[]
  guardians: GuardianInput[]
}

export type StudentOverview = Student & {
  fullName: string
  age: number | null
  groupName: string
  guardianCount: number
  sacramentCount: number
  checklistProgressPercent: number
  documentProgressPercent: number
}

export type StudentsPageResult = {
  items: StudentOverview[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export type StudentHistory = {
  student: StudentOverview
  guardians: Guardian[]
  sacraments: SacramentName[]
  attendance: Array<{
    date: string
    status: AttendanceStatus
    observations?: string
  }>
  activities: Array<{
    id: string
    title: string
    type: ActivityType
    date: string
    maxGrade: number
    grade?: number
    observations?: string
  }>
  attendanceSummary: {
    presentes: number
    ausentes: number
    justificados: number
  }
}

function buildStudentProgressMaps(
  studentIds: string[],
  studentSacraments: Array<{ studentId: string; sacramentId: string }>,
  checklistCatalog: ChecklistCatalogItem[],
  documentRequirements: DocumentRequirement[],
  checklistProgress: StudentChecklistProgress[],
  documentProgress: StudentDocumentProgress[],
) {
  const checklistProgressMap = new Map(checklistProgress.map((entry) => [entry.studentId, entry.checkedItemIds]))
  const documentProgressMap = new Map(documentProgress.map((entry) => [entry.studentId, entry.deliveredRequirementIds]))

  return new Map(
    studentIds.map((studentId) => {
      const sacramentIds = studentSacraments
        .filter((record) => record.studentId === studentId)
        .map((record) => record.sacramentId)
      const checklistItems = checklistCatalog.filter((item) => item.sacramentIds.some((sacramentId) => sacramentIds.includes(sacramentId)))
      const documentItems = documentRequirements.filter((item) => item.sacramentIds.some((sacramentId) => sacramentIds.includes(sacramentId)))
      const checkedChecklistIds = checklistProgressMap.get(studentId) ?? []
      const deliveredDocumentIds = documentProgressMap.get(studentId) ?? []

      return [
        studentId,
        {
          checklistProgressPercent:
            checklistItems.length === 0
              ? 0
              : Math.round((checklistItems.filter((item) => checkedChecklistIds.includes(item.id)).length / checklistItems.length) * 100),
          documentProgressPercent:
            documentItems.length === 0
              ? 0
              : Math.round((documentItems.filter((item) => deliveredDocumentIds.includes(item.id)).length / documentItems.length) * 100),
        },
      ] as const
    }),
  )
}

export async function getStudentOverviews(user: User, yearFilter?: number) {
  const accessibleGroupIds = await getAccessibleGroupIds(user, yearFilter)
  const [students, groups, guardians, studentSacraments, checklistCatalog, documentRequirements, checklistProgress, documentProgress] = await Promise.all([
    listDocuments<Student>('students'),
    listDocuments<{ id: string; name: string }>('groups'),
    listDocuments<Guardian>('guardians'),
    listDocuments<{ id: string; studentId: string; sacramentId: string }>('studentSacraments'),
    listDocuments<ChecklistCatalogItem>('checklistCatalog'),
    listDocuments<DocumentRequirement>('documentRequirements'),
    listDocuments<StudentChecklistProgress>('studentChecklistProgress'),
    listDocuments<StudentDocumentProgress>('studentDocumentProgress'),
  ])

  const groupMap = new Map(groups.map((group) => [group.id, group.name]))
  const progressMap = buildStudentProgressMaps(
    students.map((student) => student.id),
    studentSacraments,
    checklistCatalog,
    documentRequirements,
    checklistProgress,
    documentProgress,
  )

  return students
    .filter((student) => (user.role === 'ADMIN' || accessibleGroupIds.includes(student.groupId)) && (yearFilter ? student.year === yearFilter : true))
    .map((student) => ({
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupName: groupMap.get(student.groupId) ?? 'Sin grupo',
      guardianCount: guardians.filter((guardian) => guardian.studentId === student.id).length,
      sacramentCount: studentSacraments.filter((record) => record.studentId === student.id).length,
      checklistProgressPercent: progressMap.get(student.id)?.checklistProgressPercent ?? 0,
      documentProgressPercent: progressMap.get(student.id)?.documentProgressPercent ?? 0,
    }))
    .sort((left, right) => right.year - left.year || left.fullName.localeCompare(right.fullName, 'es'))
}

export async function getStudentsPage(
  user: User,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 20,
  groupFilter?: string,
  yearFilter?: number,
  search = '',
) {
  const accessibleGroupIds = await getAccessibleGroupIds(user)
  const activeGroupFilter = groupFilter || undefined
  const normalizedSearch = normalizeSearchText(search)

  const studentsPage = await paginateDocuments<Student>('students', {
    filters: normalizedSearch
      ? [{ field: 'searchTokens', operator: 'array-contains', value: normalizedSearch }]
      : user.role === 'ADMIN'
        ? activeGroupFilter
          ? [{ field: 'groupId', operator: '==', value: activeGroupFilter }]
          : yearFilter
            ? [{ field: 'year', operator: '==', value: yearFilter }]
          : []
        : activeGroupFilter
          ? [{ field: 'groupId', operator: '==', value: activeGroupFilter }]
          : yearFilter
            ? [{ field: 'year', operator: '==', value: yearFilter }]
          : accessibleGroupIds.length > 0 && accessibleGroupIds.length <= 10
            ? [{ field: 'groupId', operator: 'in', value: accessibleGroupIds }]
            : [],
    orderByField: normalizedSearch ? undefined : activeGroupFilter ? undefined : user.role === 'ADMIN' ? 'lastName' : undefined,
    orderByDirection: 'asc',
    limitCount: pageSize,
    cursor,
  })

  const visibleStudents =
    user.role === 'ADMIN'
      ? studentsPage.items.filter((student) =>
          (yearFilter ? student.year === yearFilter : true) &&
          (activeGroupFilter ? student.groupId === activeGroupFilter : true),
        )
      : studentsPage.items.filter(
          (student) =>
            accessibleGroupIds.includes(student.groupId) &&
            (yearFilter ? student.year === yearFilter : true) &&
            (activeGroupFilter ? student.groupId === activeGroupFilter : true),
        )

  const studentIds = visibleStudents.map((student) => student.id)
  const groupIds = [...new Set(visibleStudents.map((student) => student.groupId))]
  const [groups, guardians, studentSacraments, checklistCatalog, documentRequirements, checklistProgress, documentProgress] = await Promise.all([
    getDocumentsByIds<{ id: string; name: string }>('groups', groupIds),
    getDocumentsByFieldIn<Guardian>('guardians', 'studentId', studentIds),
    getDocumentsByFieldIn<{ id: string; studentId: string; sacramentId: string }>('studentSacraments', 'studentId', studentIds),
    listDocuments<ChecklistCatalogItem>('checklistCatalog'),
    listDocuments<DocumentRequirement>('documentRequirements'),
    listDocuments<StudentChecklistProgress>('studentChecklistProgress'),
    listDocuments<StudentDocumentProgress>('studentDocumentProgress'),
  ])
  const groupMap = new Map(groups.map((group) => [group.id, group.name]))
  const progressMap = buildStudentProgressMaps(
    studentIds,
    studentSacraments,
    checklistCatalog,
    documentRequirements,
    checklistProgress,
    documentProgress,
  )

  return {
    items: visibleStudents.map((student) => ({
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupName: groupMap.get(student.groupId) ?? 'Sin grupo',
      guardianCount: guardians.filter((guardian) => guardian.studentId === student.id).length,
      sacramentCount: studentSacraments.filter((record) => record.studentId === student.id).length,
      checklistProgressPercent: progressMap.get(student.id)?.checklistProgressPercent ?? 0,
      documentProgressPercent: progressMap.get(student.id)?.documentProgressPercent ?? 0,
    })).sort((left, right) => right.year - left.year || left.fullName.localeCompare(right.fullName, 'es')),
    nextCursor: studentsPage.nextCursor,
    hasMore: studentsPage.hasMore,
  } satisfies StudentsPageResult
}

export async function saveStudent(input: StudentInput) {
  const studentId = input.id ?? createId()
  const [existingStudent, guardians, studentSacraments, group] = await Promise.all([
    input.id ? getDocumentById<Student>('students', input.id) : Promise.resolve(undefined),
    listDocuments<Guardian>('guardians'),
    listDocuments<{ id: string; studentId: string }>('studentSacraments'),
    getDocumentById<{ id: string; name: string; year?: number }>('groups', input.groupId),
  ])

  if (input.id && !existingStudent) {
    throw new Error('No se encontro el alumno a editar.')
  }

  if (!group) {
    throw new Error('Selecciona un grupo valido para asignar el corte anual.')
  }

  if (input.activeYear && (group.year ?? getCurrentYear()) !== input.activeYear) {
    throw new Error('Solo puedes registrar alumnos en grupos del año activo.')
  }

  const normalizedGuardians = input.guardians.filter(
    (guardian) => guardian.name.trim() && guardian.relationship.trim(),
  )

  const guardiansWithPrimary =
    normalizedGuardians.length > 0 && !normalizedGuardians.some((guardian) => guardian.isPrimary)
      ? normalizedGuardians.map((guardian, index) => ({ ...guardian, isPrimary: index === 0 }))
      : normalizedGuardians

  await putDocument('students', {
    id: studentId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate?.trim() || '',
    year: group.year ?? getCurrentYear(),
    observations: input.observations?.trim(),
    active: existingStudent?.active ?? true,
    groupId: input.groupId,
    searchTokens: buildSearchTokens(
      `${input.firstName.trim()} ${input.lastName.trim()}`,
      input.firstName,
      input.lastName,
      (group.year ?? getCurrentYear()).toString(),
      input.observations,
    ),
    ...createLocalMeta(existingStudent?.createdAt, 'synced'),
  })

  await deleteDocuments(
    'guardians',
    guardians.filter((guardian) => guardian.studentId === studentId).map((guardian) => guardian.id),
  )
  await deleteDocuments(
    'studentSacraments',
    studentSacraments
      .filter((record) => record.studentId === studentId)
      .map((record) => record.id),
  )

  if (guardiansWithPrimary.length > 0) {
    await putDocuments(
      'guardians',
      guardiansWithPrimary.map((guardian) => ({
        id: createId(),
        studentId,
        name: guardian.name.trim(),
        relationship: guardian.relationship.trim(),
        phone: guardian.phone?.trim(),
        whatsapp: guardian.whatsapp?.trim(),
        email: guardian.email?.trim(),
        isPrimary: guardian.isPrimary,
        ...createLocalMeta(undefined, 'synced'),
      })),
    )
  }

  if (input.sacramentIds.length > 0) {
    await putDocuments(
      'studentSacraments',
      input.sacramentIds.map((sacramentId) => ({
        id: createId(),
        studentId,
        sacramentId,
        ...createLocalMeta(undefined, 'synced'),
      })),
    )
  }

  notifyDataChanged()
}

export async function setStudentActive(studentId: string, active: boolean) {
  const student = await getDocumentById<Student>('students', studentId)

  if (!student) {
    throw new Error('Alumno no encontrado.')
  }

  await putDocument('students', {
    ...student,
    active,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  })

  notifyDataChanged()
}

export async function getStudentHistory(user: User, studentId: string) {
  const hasAccess = await canAccessStudent(user, studentId)

  if (!hasAccess) {
    return null
  }

  const [student, groups, guardians, studentSacraments, sacraments, attendanceRecords, attendanceSessions, activities, activityGrades, checklistCatalog, documentRequirements, checklistProgress, documentProgress] =
    await Promise.all([
      getDocumentById<Student>('students', studentId),
      listDocuments<{ id: string; name: string }>('groups'),
      listDocuments<Guardian>('guardians'),
      listDocuments<{ id: string; studentId: string; sacramentId: string }>('studentSacraments'),
      listDocuments<{ id: string; name: SacramentName }>('sacraments'),
      listDocuments<{
        id: string
        sessionId: string
        studentId: string
        status: AttendanceStatus
        observations?: string
      }>('attendanceRecords'),
      listDocuments<{ id: string; groupId: string; date: string }>('attendanceSessions'),
      listDocuments<{
        id: string
        groupId: string
        title: string
        type: ActivityType
        date: string
        maxGrade: number
      }>('activities'),
      listDocuments<{
        id: string
        activityId: string
        studentId: string
        grade: number
        observations?: string
      }>('activityGrades'),
      listDocuments<ChecklistCatalogItem>('checklistCatalog'),
      listDocuments<DocumentRequirement>('documentRequirements'),
      listDocuments<StudentChecklistProgress>('studentChecklistProgress'),
      listDocuments<StudentDocumentProgress>('studentDocumentProgress'),
    ])

  if (!student) {
    return null
  }

  const studentGuardians = guardians.filter((guardian) => guardian.studentId === studentId)
  const studentSacramentLinks = studentSacraments.filter((record) => record.studentId === studentId)
  const studentSacramentIds = studentSacramentLinks.map((record) => record.sacramentId)
  const studentAttendanceRecords = attendanceRecords.filter((record) => record.studentId === studentId)
  const studentActivityGrades = activityGrades.filter((grade) => grade.studentId === studentId)
  const applicableChecklistItems = checklistCatalog.filter((item) =>
    item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)),
  )
  const applicableDocumentItems = documentRequirements.filter((item) =>
    item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)),
  )
  const checkedChecklistIds = checklistProgress.find((entry) => entry.studentId === studentId)?.checkedItemIds ?? []
  const deliveredDocumentIds = documentProgress.find((entry) => entry.studentId === studentId)?.deliveredRequirementIds ?? []

  const groupName = groups.find((group) => group.id === student.groupId)?.name ?? 'Sin grupo'
  const sessionMap = new Map(attendanceSessions.map((session) => [session.id, session]))
  const sacramentNames = studentSacramentLinks
    .map((studentSacrament) => sacraments.find((sacrament) => sacrament.id === studentSacrament.sacramentId)?.name)
    .filter(Boolean) as SacramentName[]

  const attendance = studentAttendanceRecords
    .map((record) => ({
      date: sessionMap.get(record.sessionId)?.date ?? '',
      status: record.status,
      observations: record.observations,
    }))
    .filter((record) => Boolean(record.date))
    .sort((left, right) => right.date.localeCompare(left.date))

  const gradeMap = new Map(studentActivityGrades.map((grade) => [grade.activityId, grade]))
  const studentActivities = activities
    .filter((activity) => activity.groupId === student.groupId)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      type: activity.type,
      date: activity.date,
      maxGrade: activity.maxGrade,
      grade: gradeMap.get(activity.id)?.grade,
      observations: gradeMap.get(activity.id)?.observations,
    }))
    .sort((left, right) => right.date.localeCompare(left.date))

  return {
    student: {
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupName,
      guardianCount: studentGuardians.length,
      sacramentCount: sacramentNames.length,
      checklistProgressPercent:
        applicableChecklistItems.length === 0
          ? 0
          : Math.round((applicableChecklistItems.filter((item) => checkedChecklistIds.includes(item.id)).length / applicableChecklistItems.length) * 100),
      documentProgressPercent:
        applicableDocumentItems.length === 0
          ? 0
          : Math.round((applicableDocumentItems.filter((item) => deliveredDocumentIds.includes(item.id)).length / applicableDocumentItems.length) * 100),
    },
    guardians: studentGuardians,
    sacraments: sacramentNames,
    attendance,
    activities: studentActivities,
    attendanceSummary: {
      presentes: attendance.filter((entry) => entry.status === 'PRESENTE').length,
      ausentes: attendance.filter((entry) => entry.status === 'AUSENTE').length,
      justificados: attendance.filter((entry) => entry.status === 'JUSTIFICADO').length,
    },
  } satisfies StudentHistory
}
