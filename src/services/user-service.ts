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
import { notifyDataChanged } from '@/store/data-store'
import type { Group, User } from '@/types/models'
import { calculateAge } from '@/utils/date'
import { createId, createLocalMeta } from '@/utils/entity'
import { buildSearchTokens, normalizeSearchText } from '@/utils/search'

export type CatechistInput = {
  id?: string
  fullName: string
  username: string
  password?: string
  phone?: string
  email?: string
  groupIds?: string[]
}

export type CatechistOverview = User & {
  groupNames: string[]
  groupCount: number
}

export type CatechistsPageResult = {
  items: CatechistOverview[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export type CatechistDetail = CatechistOverview & {
  students: Array<{
    id: string
    fullName: string
    age: number
    groupId: string
    groupName: string
    active: boolean
  }>
  groups: Array<{
    id: string
    name: string
    schedule?: string
    active: boolean
    studentCount: number
  }>
  activeStudentCount: number
}

export async function getCatechistUsers() {
  const users = await listDocuments<User>('users')
  return users.filter((user) => user.role === 'CATECHIST')
}

export async function getCatechistOverviews() {
  const [users, groups, userGroups] = await Promise.all([
    getCatechistUsers(),
    listDocuments<Group>('groups'),
    listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
  ])

  const groupMap = new Map(groups.map((group) => [group.id, group]))

  return users
    .map((user) => {
      const assignedGroups = userGroups
        .filter((assignment) => assignment.userId === user.id)
        .map((assignment) => groupMap.get(assignment.groupId))
        .filter(Boolean) as Group[]

      return {
        ...user,
        groupNames: assignedGroups.map((group) => group.name),
        groupCount: assignedGroups.length,
      }
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'))
}

export async function getCatechistsPage(
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 20,
  search = '',
) {
  const normalizedSearch = normalizeSearchText(search)
  const usersPage = await paginateDocuments<User>('users', {
    filters: normalizedSearch
      ? [{ field: 'searchTokens', operator: 'array-contains', value: normalizedSearch }]
      : [{ field: 'role', operator: '==', value: 'CATECHIST' }],
    orderByField: undefined,
    limitCount: pageSize,
    cursor,
  })

  const visibleUsers = normalizedSearch
    ? usersPage.items.filter((user) => user.role === 'CATECHIST')
    : usersPage.items

  const userIds = visibleUsers.map((user) => user.id)
  const userGroups = await getDocumentsByFieldIn<{ id: string; userId: string; groupId: string }>(
    'userGroups',
    'userId',
    userIds,
  )
  const groupIds = [...new Set(userGroups.map((assignment) => assignment.groupId))]
  const groups = await getDocumentsByIds<Group>('groups', groupIds)
  const groupMap = new Map(groups.map((group) => [group.id, group]))

  return {
    items: visibleUsers.map((user) => {
      const assignedGroups = userGroups
        .filter((assignment) => assignment.userId === user.id)
        .map((assignment) => groupMap.get(assignment.groupId))
        .filter(Boolean) as Group[]

      return {
        ...user,
        groupNames: assignedGroups.map((group) => group.name),
        groupCount: assignedGroups.length,
      }
    }).sort((left, right) => left.fullName.localeCompare(right.fullName, 'es')),
    nextCursor: usersPage.nextCursor,
    hasMore: usersPage.hasMore,
  } satisfies CatechistsPageResult
}

export async function getCatechistDetail(userId: string) {
  const [user, groups, userGroups, students] = await Promise.all([
    getDocumentById<User>('users', userId),
    listDocuments<Group>('groups'),
    listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
    listDocuments<{
      id: string
      firstName: string
      lastName: string
      birthDate: string
      groupId: string
      active: boolean
    }>('students'),
  ])

  if (!user || user.role !== 'CATECHIST') {
    return null
  }

  const assignedGroupIds = userGroups
    .filter((assignment) => assignment.userId === user.id)
    .map((assignment) => assignment.groupId)
  const assignedGroups = groups
    .filter((group) => assignedGroupIds.includes(group.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  const detailStudents = students
    .filter((student) => assignedGroupIds.includes(student.groupId))
    .map((student) => ({
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`,
      age: calculateAge(student.birthDate),
      groupId: student.groupId,
      groupName: assignedGroups.find((group) => group.id === student.groupId)?.name ?? 'Grupo',
      active: student.active,
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'))

  return {
    ...user,
    groupNames: assignedGroups.map((group) => group.name),
    groupCount: assignedGroups.length,
    groups: assignedGroups.map((group) => ({
      id: group.id,
      name: group.name,
      schedule: group.schedule,
      active: group.active,
      studentCount: detailStudents.filter((student) => student.groupId === group.id && student.active).length,
    })),
    students: detailStudents,
    activeStudentCount: detailStudents.filter((student) => student.active).length,
  } satisfies CatechistDetail
}

export async function saveCatechist(input: CatechistInput) {
  const userId = input.id ?? createId()
  const [existingUser, users, userGroups] = await Promise.all([
    input.id ? getDocumentById<User>('users', input.id) : Promise.resolve(undefined),
    listDocuments<User>('users'),
    listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
  ])
  const normalizedUsername = input.username.trim().toLowerCase()
  const duplicate = users.find(
    (user) => user.username.trim().toLowerCase() === normalizedUsername,
  )

  if (duplicate && duplicate.id !== input.id) {
    throw new Error('El nombre de usuario ya existe.')
  }

  if (input.id && (!existingUser || existingUser.role !== 'CATECHIST')) {
    throw new Error('No se encontro el catequista a editar.')
  }

  if (!input.id && !input.password) {
    throw new Error('La contrasena es obligatoria para nuevos catequistas.')
  }

  const user: User = {
    id: userId,
    fullName: input.fullName.trim(),
    username: normalizedUsername,
    password: input.password?.trim() || existingUser?.password || '',
    role: 'CATECHIST',
    phone: input.phone?.trim(),
    email: input.email?.trim(),
    active: existingUser?.active ?? true,
    searchTokens: buildSearchTokens(input.fullName, normalizedUsername, input.email),
    ...createLocalMeta(existingUser?.createdAt, 'synced'),
  }

  await putDocument('users', user)

  if (input.groupIds) {
    const existingAssignmentIds = userGroups
      .filter((assignment) => assignment.userId === userId)
      .map((assignment) => assignment.id)

    await deleteDocuments('userGroups', existingAssignmentIds)

    if (input.groupIds.length > 0) {
      await putDocuments(
        'userGroups',
        input.groupIds.map((groupId) => ({
          id: createId(),
          userId,
          groupId,
          ...createLocalMeta(undefined, 'synced'),
        })),
      )
    }
  }

  notifyDataChanged()
}

export async function setCatechistActive(userId: string, active: boolean) {
  const user = await getDocumentById<User>('users', userId)

  if (!user || user.role !== 'CATECHIST') {
    throw new Error('Catequista no encontrado.')
  }

  await putDocument('users', {
    ...user,
    active,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  })

  notifyDataChanged()
}
