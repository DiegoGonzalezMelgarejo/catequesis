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
import { canAccessGroup, getAccessibleGroupIds } from '@/services/access-service'
import { notifyDataChanged } from '@/store/data-store'
import type {
  ActivityType,
  AttendanceStatus,
  ChecklistCatalogItem,
  DocumentRequirement,
  Group,
  StudentChecklistProgress,
  StudentDocumentProgress,
  User,
} from '@/types/models'
import { calculateAge } from '@/utils/date'
import { createId, createLocalMeta } from '@/utils/entity'
import { buildSearchTokens, normalizeSearchText } from '@/utils/search'
import { getCurrentYear } from '@/utils/year'

export type GroupInput = {
  id?: string
  name: string
  year: number
  activeYear?: number
  description?: string
  schedule?: string
  catechistIds: string[]
}

export type GroupOverview = Group & {
  catechists: string[]
  studentCount: number
  pendingActivities: number
  lastAttendanceDate?: string
}

export type GroupDetailStudent = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  birthDate: string
  age: number | null
  observations?: string
  active: boolean
  guardianCount: number
  sacramentCount: number
  primaryGuardianName?: string
  primaryGuardianPhone?: string
  attendanceRate: number
  absenceCount: number
  lastAttendanceDate?: string
  lastAttendanceStatus?: AttendanceStatus
  checklistProgressPercent: number
  documentProgressPercent: number
}

export type GroupAttendanceDay = {
  id: string
  date: string
  notes?: string
  counts: {
    presentes: number
    ausentes: number
    justificados: number
  }
  records: Array<{
    studentId: string
    studentName: string
    status: AttendanceStatus
    observations?: string
  }>
}

export type GroupDetail = GroupOverview & {
  catechistIds: string[]
  students: GroupDetailStudent[]
  attendanceSessions: GroupAttendanceDay[]
  activityCount: number
  allActivities: Array<{
    id: string
    title: string
    date: string
    type: ActivityType
    maxGrade: number
    active: boolean
  }>
  recentActivities: Array<{
    id: string
    title: string
    date: string
    type: ActivityType
    maxGrade: number
    active: boolean
  }>
  attendanceMatrix: Array<{
    studentId: string
    studentName: string
    entries: Array<{
      date: string
      status: AttendanceStatus | 'SIN_REGISTRO'
      observations?: string
    }>
  }>
  gradesMatrix: Array<{
    studentId: string
    studentName: string
    entries: Array<{
      activityId: string
      activityTitle: string
      date: string
      maxGrade: number
      grade?: number
      observations?: string
    }>
  }>
}

export type GroupsPageResult = {
  items: GroupOverview[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export async function getGroupOverviews(user: User, yearFilter?: number) {
  const accessibleGroupIds = await getAccessibleGroupIds(user, yearFilter)
  const [groups, users, userGroups, students, activities, activityGrades, attendanceSessions] =
    await Promise.all([
      listDocuments<Group>('groups'),
      listDocuments<{ id: string; role: string; fullName: string }>('users'),
      listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
      listDocuments<{ id: string; groupId: string; active: boolean }>('students'),
      listDocuments<{ id: string; groupId: string; active: boolean }>('activities'),
      listDocuments<{ id: string; activityId: string }>('activityGrades'),
      listDocuments<{ id: string; groupId: string; date: string }>('attendanceSessions'),
    ])

  const catechistMap = new Map(
    users.filter((catechist) => catechist.role === 'CATECHIST').map((catechist) => [catechist.id, catechist]),
  )

  return groups
    .filter((group) => (user.role === 'ADMIN' || accessibleGroupIds.includes(group.id)) && (yearFilter ? group.year === yearFilter : true))
    .map((group) => {
      const assignedCatechists = userGroups
        .filter((assignment) => assignment.groupId === group.id)
        .map((assignment) => catechistMap.get(assignment.userId)?.fullName)
        .filter(Boolean) as string[]

      const activeStudents = students.filter((student) => student.groupId === group.id && student.active)
      const groupActivities = activities.filter((activity) => activity.groupId === group.id && activity.active)
      const pendingActivities = groupActivities.filter((activity) => {
        const gradeCount = activityGrades.filter((grade) => grade.activityId === activity.id).length
        return activeStudents.length > 0 && gradeCount < activeStudents.length
      }).length
      const lastAttendance = attendanceSessions
        .filter((session) => session.groupId === group.id)
        .sort((left, right) => right.date.localeCompare(left.date))[0]

      return {
        ...group,
        catechists: assignedCatechists,
        studentCount: activeStudents.length,
        pendingActivities,
        lastAttendanceDate: lastAttendance?.date,
      }
    })
    .sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es'))
}

export async function getGroupsPage(
  user: User,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 20,
  yearFilter?: number,
  search = '',
) {
  const normalizedSearch = normalizeSearchText(search)
  let pageGroups: Group[] = []
  let nextCursor: QueryDocumentSnapshot<DocumentData> | null = null
  let hasMore = false

  if (user.role === 'ADMIN') {
    const groupsPage = await paginateDocuments<Group>('groups', {
      filters: normalizedSearch
        ? [{ field: 'searchTokens', operator: 'array-contains', value: normalizedSearch }]
        : yearFilter
          ? [{ field: 'year', operator: '==', value: yearFilter }]
          : [],
      orderByField: normalizedSearch ? undefined : 'name',
      orderByDirection: 'asc',
      limitCount: pageSize,
      cursor,
    })

    pageGroups = groupsPage.items
    nextCursor = groupsPage.nextCursor
    hasMore = groupsPage.hasMore
  } else {
    const assignmentsPage = await paginateDocuments<{ id: string; userId: string; groupId: string }>('userGroups', {
      filters: [{ field: 'userId', operator: '==', value: user.id }],
      limitCount: pageSize,
      cursor,
    })

    const groupIds = assignmentsPage.items.map((assignment) => assignment.groupId)
    pageGroups = await getDocumentsByIds<Group>('groups', groupIds)
    if (normalizedSearch) {
      pageGroups = pageGroups.filter((group) => (group.searchTokens ?? []).includes(normalizedSearch))
    }
    if (yearFilter) {
      pageGroups = pageGroups.filter((group) => group.year === yearFilter)
    }
    nextCursor = assignmentsPage.nextCursor
    hasMore = assignmentsPage.hasMore
  }

  const groupIds = pageGroups.map((group) => group.id)
  const [users, userGroups, students, activities, attendanceSessions] = await Promise.all([
    listDocuments<{ id: string; role: string; fullName: string }>('users'),
    getDocumentsByFieldIn<{ id: string; userId: string; groupId: string }>('userGroups', 'groupId', groupIds),
    getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('students', 'groupId', groupIds),
    getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('activities', 'groupId', groupIds),
    getDocumentsByFieldIn<{ id: string; groupId: string; date: string }>('attendanceSessions', 'groupId', groupIds),
  ])

  const activityIds = activities.map((activity) => activity.id)
  const activityGrades = await getDocumentsByFieldIn<{ id: string; activityId: string }>(
    'activityGrades',
    'activityId',
    activityIds,
  )
  const catechistMap = new Map(
    users.filter((entry) => entry.role === 'CATECHIST').map((entry) => [entry.id, entry.fullName]),
  )

  return {
    items: pageGroups.map((group) => {
      const assignedCatechists = userGroups
        .filter((assignment) => assignment.groupId === group.id)
        .map((assignment) => catechistMap.get(assignment.userId))
        .filter(Boolean) as string[]

      const activeStudents = students.filter((student) => student.groupId === group.id && student.active)
      const groupActivities = activities.filter((activity) => activity.groupId === group.id && activity.active)
      const pendingActivities = groupActivities.filter((activity) => {
        const gradeCount = activityGrades.filter((grade) => grade.activityId === activity.id).length
        return activeStudents.length > 0 && gradeCount < activeStudents.length
      }).length
      const lastAttendance = attendanceSessions
        .filter((session) => session.groupId === group.id)
        .sort((left, right) => right.date.localeCompare(left.date))[0]

      return {
        ...group,
        catechists: assignedCatechists,
        studentCount: activeStudents.length,
        pendingActivities,
        lastAttendanceDate: lastAttendance?.date,
      }
    }).sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es')),
    nextCursor,
    hasMore,
  } satisfies GroupsPageResult
}

export async function saveGroup(input: GroupInput) {
  if (input.activeYear && input.year !== input.activeYear) {
    throw new Error('El grupo debe guardarse dentro del año activo seleccionado.')
  }

  const groupId = input.id ?? createId()
  const [existingGroup, userGroups, students] = await Promise.all([
    input.id ? getDocumentById<Group>('groups', input.id) : Promise.resolve(undefined),
    listDocuments<{ id: string; groupId: string; userId: string }>('userGroups'),
    listDocuments<{ id: string; groupId: string; year: number }>('students'),
  ])

  if (input.id && !existingGroup) {
    throw new Error('No se encontro el grupo a editar.')
  }

  await putDocument('groups', {
    id: groupId,
    name: input.name.trim(),
    year: input.year,
    description: input.description?.trim(),
    schedule: input.schedule?.trim(),
    active: existingGroup?.active ?? true,
    searchTokens: buildSearchTokens(input.name, input.year.toString(), input.description, input.schedule),
    ...createLocalMeta(existingGroup?.createdAt, 'synced'),
  })

  const studentsInGroup = students.filter((student) => student.groupId === groupId && student.year !== input.year)

  if (studentsInGroup.length > 0) {
    await putDocuments(
      'students',
      studentsInGroup.map((student) => ({
        ...student,
        year: input.year,
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced' as const,
      })),
    )
  }

  await deleteDocuments(
    'userGroups',
    userGroups.filter((assignment) => assignment.groupId === groupId).map((assignment) => assignment.id),
  )

  if (input.catechistIds.length > 0) {
    await putDocuments(
      'userGroups',
      input.catechistIds.map((userId) => ({
        id: createId(),
        userId,
        groupId,
        ...createLocalMeta(undefined, 'synced'),
      })),
    )
  }

  notifyDataChanged()
}

export async function getGroupDetail(user: User, groupId: string) {
  const hasAccess = await canAccessGroup(user, groupId)

  if (!hasAccess) {
    return null
  }

  const [group, users, userGroups, students, attendanceSessions, activities] = await Promise.all([
    getDocumentById<Group>('groups', groupId),
    listDocuments<{ id: string; role: string; fullName: string }>('users'),
    listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
    listDocuments<{
      id: string
      firstName: string
      lastName: string
      birthDate: string
      year: number
      observations?: string
      active: boolean
      groupId: string
    }>('students'),
    listDocuments<{ id: string; groupId: string; date: string; notes?: string }>('attendanceSessions'),
    listDocuments<{
      id: string
      groupId: string
      title: string
      date: string
      type: ActivityType
      maxGrade: number
      active: boolean
    }>('activities'),
  ])

  if (!group) {
    return null
  }

  const [guardians, studentSacraments, attendanceRecords, activityGrades, checklistCatalog, documentRequirements, checklistProgress, documentProgress] = await Promise.all([
    listDocuments<{
      id: string
      studentId: string
      name: string
      phone?: string
      whatsapp?: string
      email?: string
      isPrimary: boolean
    }>('guardians'),
    listDocuments<{ id: string; studentId: string; sacramentId: string }>('studentSacraments'),
    listDocuments<{
      id: string
      sessionId: string
      studentId: string
      status: AttendanceStatus
      observations?: string
    }>('attendanceRecords'),
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

  const filteredUserGroups = userGroups.filter((assignment) => assignment.groupId === groupId)
  const groupStudents = students.filter((student) => student.groupId === groupId)
  const groupSessions = attendanceSessions.filter((session) => session.groupId === groupId)
  const groupActivities = activities.filter((activity) => activity.groupId === groupId)

  const catechistMap = new Map(
    users.filter((catechist) => catechist.role === 'CATECHIST').map((catechist) => [catechist.id, catechist.fullName]),
  )
  const studentMap = new Map(groupStudents.map((student) => [student.id, student]))
  const activeStudents = groupStudents.filter((student) => student.active)
  const assignedCatechists = userGroups
    .filter((assignment) => assignment.groupId === groupId)
    .map((assignment) => catechistMap.get(assignment.userId))
    .filter(Boolean) as string[]

  const pendingActivities = groupActivities.filter((activity) => {
    const gradeCount = activityGrades.filter((grade) => grade.activityId === activity.id).length
    return activity.active && activeStudents.length > 0 && gradeCount < activeStudents.length
  }).length

  const attendanceSessionsDetail = groupSessions
    .map((session) => {
      const sessionRecords = attendanceRecords
        .filter((record) => record.sessionId === session.id)
        .map((record) => ({
          studentId: record.studentId,
          studentName: studentMap.get(record.studentId)
            ? `${studentMap.get(record.studentId)?.firstName} ${studentMap.get(record.studentId)?.lastName}`
            : 'Alumno',
          status: record.status,
          observations: record.observations,
        }))
        .sort((left, right) => left.studentName.localeCompare(right.studentName, 'es'))

      return {
        id: session.id,
        date: session.date,
        notes: session.notes,
        counts: {
          presentes: sessionRecords.filter((record) => record.status === 'PRESENTE').length,
          ausentes: sessionRecords.filter((record) => record.status === 'AUSENTE').length,
          justificados: sessionRecords.filter((record) => record.status === 'JUSTIFICADO').length,
        },
        records: sessionRecords,
      }
    })
    .sort((left, right) => right.date.localeCompare(left.date))

  const checklistProgressMap = new Map(checklistProgress.map((entry) => [entry.studentId, entry.checkedItemIds]))
  const documentProgressMap = new Map(documentProgress.map((entry) => [entry.studentId, entry.deliveredRequirementIds]))

  const studentsDetail = groupStudents
    .map((student) => {
      const studentGuardians = guardians.filter((guardian) => guardian.studentId === student.id)
      const primaryGuardian =
        studentGuardians.find((guardian) => guardian.isPrimary) ?? studentGuardians[0]
      const studentAttendance = attendanceSessionsDetail
        .map((session) => {
          const record = session.records.find((entry) => entry.studentId === student.id)
          return record ? { date: session.date, status: record.status } : null
        })
        .filter(Boolean) as Array<{ date: string; status: AttendanceStatus }>
      const positiveAttendance = studentAttendance.filter(
        (entry) => entry.status === 'PRESENTE' || entry.status === 'JUSTIFICADO',
      ).length
      const studentSacramentIds = studentSacraments
        .filter((record) => record.studentId === student.id)
        .map((record) => record.sacramentId)
      const applicableChecklistItems = checklistCatalog.filter((item) =>
        item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)),
      )
      const applicableDocumentItems = documentRequirements.filter((item) =>
        item.sacramentIds.some((sacramentId) => studentSacramentIds.includes(sacramentId)),
      )
      const checkedChecklistIds = checklistProgressMap.get(student.id) ?? []
      const deliveredDocumentIds = documentProgressMap.get(student.id) ?? []

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        birthDate: student.birthDate,
        age: calculateAge(student.birthDate),
        observations: student.observations,
        active: student.active,
        guardianCount: studentGuardians.length,
        sacramentCount: studentSacraments.filter((record) => record.studentId === student.id).length,
        primaryGuardianName: primaryGuardian?.name,
        primaryGuardianPhone:
          primaryGuardian?.phone ?? primaryGuardian?.whatsapp ?? primaryGuardian?.email,
        attendanceRate:
          studentAttendance.length > 0 ? (positiveAttendance / studentAttendance.length) * 100 : 0,
        absenceCount: studentAttendance.filter((entry) => entry.status === 'AUSENTE').length,
        lastAttendanceDate: studentAttendance[0]?.date,
        lastAttendanceStatus: studentAttendance[0]?.status,
        checklistProgressPercent:
          applicableChecklistItems.length === 0
            ? 0
            : Math.round((applicableChecklistItems.filter((item) => checkedChecklistIds.includes(item.id)).length / applicableChecklistItems.length) * 100),
        documentProgressPercent:
          applicableDocumentItems.length === 0
            ? 0
            : Math.round((applicableDocumentItems.filter((item) => deliveredDocumentIds.includes(item.id)).length / applicableDocumentItems.length) * 100),
      }
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'))

  const attendanceMatrix = studentsDetail.map((student) => ({
    studentId: student.id,
    studentName: student.fullName,
    entries: attendanceSessionsDetail.map((session) => {
      const record = session.records.find((entry) => entry.studentId === student.id)

      return {
        date: session.date,
        status: (record?.status ?? 'SIN_REGISTRO') as AttendanceStatus | 'SIN_REGISTRO',
        observations: record?.observations,
      }
    }),
  }))

  const gradesMatrix = studentsDetail.map((student) => ({
    studentId: student.id,
    studentName: student.fullName,
    entries: groupActivities
      .map((activity) => {
        const gradeRecord = activityGrades.find(
          (grade) => grade.activityId === activity.id && grade.studentId === student.id,
        )

        return {
          activityId: activity.id,
          activityTitle: activity.title,
          date: activity.date,
          maxGrade: activity.maxGrade,
          grade: gradeRecord?.grade,
          observations: gradeRecord?.observations,
        }
      })
      .sort((left, right) => right.date.localeCompare(left.date)),
  }))

  return {
    ...group,
    catechists: assignedCatechists,
    catechistIds: filteredUserGroups.map((assignment) => assignment.userId),
    studentCount: activeStudents.length,
    pendingActivities,
    lastAttendanceDate: attendanceSessionsDetail[0]?.date,
    students: studentsDetail,
    attendanceSessions: attendanceSessionsDetail,
    activityCount: groupActivities.filter((activity) => activity.active).length,
    allActivities: groupActivities
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        date: activity.date,
        type: activity.type,
        maxGrade: activity.maxGrade,
        active: activity.active,
      }))
      .sort((left, right) => right.date.localeCompare(left.date)),
    recentActivities: groupActivities
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        date: activity.date,
        type: activity.type,
        maxGrade: activity.maxGrade,
        active: activity.active,
      }))
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 5),
    attendanceMatrix,
    gradesMatrix,
  } satisfies GroupDetail
}

export async function setGroupActive(groupId: string, active: boolean) {
  const group = await getDocumentById<Group>('groups', groupId)

  if (!group) {
    throw new Error('Grupo no encontrado.')
  }

  await putDocument('groups', {
    ...group,
    year: group.year ?? getCurrentYear(),
    active,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  })

  notifyDataChanged()
}
