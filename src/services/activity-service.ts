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
import type { Activity, ActivityType, User } from '@/types/models'
import { createId, createLocalMeta } from '@/utils/entity'

export type ActivityInput = {
  id?: string
  groupId: string
  title: string
  description?: string
  date: string
  maxGrade: number
  type: ActivityType
  createdBy: string
}

export type ActivityOverview = Activity & {
  groupName: string
  studentCount: number
  gradedCount: number
}

export type ActivitiesPageResult = {
  items: ActivityOverview[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export type ActivityGradeInput = {
  studentId: string
  grade?: number
  observations?: string
}

export async function getActivityOverviews(user: User, groupFilter?: string) {
  const accessibleGroupIds = await getAccessibleGroupIds(user)
  const [activities, groups, students, grades] = await Promise.all([
    listDocuments<Activity>('activities'),
    listDocuments<{ id: string; name: string }>('groups'),
    listDocuments<{ id: string; groupId: string; active: boolean }>('students'),
    listDocuments<{ id: string; activityId: string }>('activityGrades'),
  ])

  const groupMap = new Map(groups.map((group) => [group.id, group.name]))

  return activities
    .filter((activity) => {
      const canSeeGroup = user.role === 'ADMIN' || accessibleGroupIds.includes(activity.groupId)
      const matchesGroup = groupFilter ? activity.groupId === groupFilter : true
      return canSeeGroup && matchesGroup
    })
    .map((activity) => ({
      ...activity,
      groupName: groupMap.get(activity.groupId) ?? 'Sin grupo',
      studentCount: students.filter((student) => student.groupId === activity.groupId && student.active).length,
      gradedCount: grades.filter((grade) => grade.activityId === activity.id).length,
    }))
    .sort((left, right) => right.date.localeCompare(left.date))
}

export async function getActivitiesPage(
  user: User,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 20,
  groupFilter?: string,
) {
  const accessibleGroupIds = await getAccessibleGroupIds(user)
  const activeGroupFilter = groupFilter || undefined

  const activitiesPage = await paginateDocuments<Activity>('activities', {
    filters:
      user.role === 'ADMIN'
        ? activeGroupFilter
          ? [{ field: 'groupId', operator: '==', value: activeGroupFilter }]
          : []
        : activeGroupFilter
          ? [{ field: 'groupId', operator: '==', value: activeGroupFilter }]
          : accessibleGroupIds.length > 0 && accessibleGroupIds.length <= 10
            ? [{ field: 'groupId', operator: 'in', value: accessibleGroupIds }]
            : [],
    orderByField: user.role === 'ADMIN' && !activeGroupFilter ? 'date' : undefined,
    orderByDirection: 'desc',
    limitCount: pageSize,
    cursor,
  })

  const visibleActivities =
    user.role === 'ADMIN'
      ? activitiesPage.items
      : activitiesPage.items.filter((activity) => accessibleGroupIds.includes(activity.groupId))
  const sortedVisibleActivities = [...visibleActivities].sort((left, right) =>
    right.date.localeCompare(left.date),
  )

  const groupIds = [...new Set(visibleActivities.map((activity) => activity.groupId))]
  const activityIds = visibleActivities.map((activity) => activity.id)
  const [groups, students, grades] = await Promise.all([
    getDocumentsByIds<{ id: string; name: string }>('groups', groupIds),
    getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('students', 'groupId', groupIds),
    getDocumentsByFieldIn<{ id: string; activityId: string }>('activityGrades', 'activityId', activityIds),
  ])
  const groupMap = new Map(groups.map((group) => [group.id, group.name]))

  return {
    items: sortedVisibleActivities.map((activity) => ({
      ...activity,
      groupName: groupMap.get(activity.groupId) ?? 'Sin grupo',
      studentCount: students.filter((student) => student.groupId === activity.groupId && student.active).length,
      gradedCount: grades.filter((grade) => grade.activityId === activity.id).length,
    })),
    nextCursor: activitiesPage.nextCursor,
    hasMore: activitiesPage.hasMore,
  } satisfies ActivitiesPageResult
}

export async function saveActivity(input: ActivityInput) {
  const [existingActivity, currentUser] = await Promise.all([
    input.id ? getDocumentById<Activity>('activities', input.id) : Promise.resolve(undefined),
    getDocumentById<User>('users', input.createdBy),
  ])

  if (input.id && !existingActivity) {
    throw new Error('No se encontro la actividad a editar.')
  }

  if (!currentUser) {
    throw new Error('No se encontro el usuario que crea la actividad.')
  }

  const hasAccess = await canAccessGroup(currentUser, input.groupId)
  if (!hasAccess) {
    throw new Error('No tienes acceso a este grupo.')
  }

  await putDocument('activities', {
    id: input.id ?? createId(),
    groupId: input.groupId,
    title: input.title.trim(),
    description: input.description?.trim(),
    date: input.date,
    maxGrade: input.maxGrade,
    type: input.type,
    active: existingActivity?.active ?? true,
    createdBy: input.createdBy,
    ...createLocalMeta(existingActivity?.createdAt, 'synced'),
  })

  notifyDataChanged()
}

export async function setActivityActive(activityId: string, active: boolean) {
  const activity = await getDocumentById<Activity>('activities', activityId)

  if (!activity) {
    throw new Error('Actividad no encontrada.')
  }

  await putDocument('activities', {
    ...activity,
    active,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  })

  notifyDataChanged()
}

export async function getActivityGradeSheet(user: User, activityId: string) {
  const activity = await getDocumentById<Activity>('activities', activityId)

  if (!activity) {
    return null
  }

  const hasAccess = await canAccessGroup(user, activity.groupId)
  if (!hasAccess) {
    return null
  }

  const [students, grades] = await Promise.all([
    listDocuments<{ id: string; groupId: string; active: boolean; firstName: string; lastName: string }>(
      'students',
    ),
    listDocuments<{
      id: string
      activityId: string
      studentId: string
      grade: number
      observations?: string
    }>('activityGrades'),
  ])

  return {
    activity,
    students: students.filter(
      (student) => student.groupId === activity.groupId && student.active,
    ),
    grades: new Map(grades.map((grade) => [grade.studentId, grade])),
  }
}

export async function saveActivityGrades(activityId: string, grades: ActivityGradeInput[]) {
  const [activity, allGrades] = await Promise.all([
    getDocumentById<Activity>('activities', activityId),
    listDocuments<{ id: string; activityId: string }>('activityGrades'),
  ])

  if (!activity) {
    throw new Error('Actividad no encontrada.')
  }

  const validGrades = grades.filter((grade) => grade.grade != null)
  const invalidGrade = validGrades.find((grade) => Number(grade.grade) > activity.maxGrade)

  if (invalidGrade) {
    throw new Error(`La nota maxima permitida es ${activity.maxGrade}.`)
  }

  await deleteDocuments(
    'activityGrades',
    allGrades.filter((grade) => grade.activityId === activityId).map((grade) => grade.id),
  )

  if (validGrades.length > 0) {
    await putDocuments(
      'activityGrades',
      validGrades.map((grade) => ({
        id: createId(),
        activityId,
        studentId: grade.studentId,
        grade: Number(grade.grade),
        observations: grade.observations?.trim(),
        ...createLocalMeta(undefined, 'synced'),
      })),
    )
  }

  notifyDataChanged()
}
