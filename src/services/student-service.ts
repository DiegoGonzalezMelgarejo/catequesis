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
import type { ActivityType, AttendanceStatus, Guardian, SacramentName, Student, User } from '@/types/models'
import { calculateAge } from '@/utils/date'
import { createId, createLocalMeta } from '@/utils/entity'
import { buildSearchTokens, normalizeSearchText } from '@/utils/search'

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
  birthDate: string
  observations?: string
  groupId: string
  sacramentIds: string[]
  guardians: GuardianInput[]
}

export type StudentOverview = Student & {
  fullName: string
  age: number
  groupName: string
  guardianCount: number
  sacramentCount: number
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

export async function getStudentOverviews(user: User) {
  const accessibleGroupIds = await getAccessibleGroupIds(user)
  const [students, groups, guardians, studentSacraments] = await Promise.all([
    listDocuments<Student>('students'),
    listDocuments<{ id: string; name: string }>('groups'),
    listDocuments<Guardian>('guardians'),
    listDocuments<{ id: string; studentId: string }>('studentSacraments'),
  ])

  const groupMap = new Map(groups.map((group) => [group.id, group.name]))

  return students
    .filter((student) => user.role === 'ADMIN' || accessibleGroupIds.includes(student.groupId))
    .map((student) => ({
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupName: groupMap.get(student.groupId) ?? 'Sin grupo',
      guardianCount: guardians.filter((guardian) => guardian.studentId === student.id).length,
      sacramentCount: studentSacraments.filter((record) => record.studentId === student.id).length,
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'))
}

export async function getStudentsPage(
  user: User,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 20,
  groupFilter?: string,
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
          : []
        : activeGroupFilter
          ? [{ field: 'groupId', operator: '==', value: activeGroupFilter }]
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
          activeGroupFilter ? student.groupId === activeGroupFilter : true,
        )
      : studentsPage.items.filter(
          (student) =>
            accessibleGroupIds.includes(student.groupId) &&
            (activeGroupFilter ? student.groupId === activeGroupFilter : true),
        )

  const studentIds = visibleStudents.map((student) => student.id)
  const groupIds = [...new Set(visibleStudents.map((student) => student.groupId))]
  const [groups, guardians, studentSacraments] = await Promise.all([
    getDocumentsByIds<{ id: string; name: string }>('groups', groupIds),
    getDocumentsByFieldIn<Guardian>('guardians', 'studentId', studentIds),
    getDocumentsByFieldIn<{ id: string; studentId: string }>('studentSacraments', 'studentId', studentIds),
  ])
  const groupMap = new Map(groups.map((group) => [group.id, group.name]))

  return {
    items: visibleStudents.map((student) => ({
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupName: groupMap.get(student.groupId) ?? 'Sin grupo',
      guardianCount: guardians.filter((guardian) => guardian.studentId === student.id).length,
      sacramentCount: studentSacraments.filter((record) => record.studentId === student.id).length,
    })),
    nextCursor: studentsPage.nextCursor,
    hasMore: studentsPage.hasMore,
  } satisfies StudentsPageResult
}

export async function saveStudent(input: StudentInput) {
  const studentId = input.id ?? createId()
  const [existingStudent, guardians, studentSacraments] = await Promise.all([
    input.id ? getDocumentById<Student>('students', input.id) : Promise.resolve(undefined),
    listDocuments<Guardian>('guardians'),
    listDocuments<{ id: string; studentId: string }>('studentSacraments'),
  ])

  if (input.id && !existingStudent) {
    throw new Error('No se encontro el alumno a editar.')
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
    birthDate: input.birthDate,
    observations: input.observations?.trim(),
    active: existingStudent?.active ?? true,
    groupId: input.groupId,
    searchTokens: buildSearchTokens(
      `${input.firstName.trim()} ${input.lastName.trim()}`,
      input.firstName,
      input.lastName,
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

  const [student, groups, guardians, studentSacraments, sacraments, attendanceRecords, attendanceSessions, activities, activityGrades] =
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
    ])

  if (!student) {
    return null
  }

  const studentGuardians = guardians.filter((guardian) => guardian.studentId === studentId)
  const studentSacramentLinks = studentSacraments.filter((record) => record.studentId === studentId)
  const studentAttendanceRecords = attendanceRecords.filter((record) => record.studentId === studentId)
  const studentActivityGrades = activityGrades.filter((grade) => grade.studentId === studentId)

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
