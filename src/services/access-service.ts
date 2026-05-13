import { getDocumentById, getDocumentsByField, listDocuments, type ReadOptions } from '@/database/firestore-repository'
import type { Group, Student, User, UserGroup } from '@/types/models'

const ACCESS_CACHE_TTL_MS = 2 * 60 * 1000

function withAccessCache(options: ReadOptions | undefined, cacheKey: string): ReadOptions {
  return {
    cacheKey,
    maxAgeMs: ACCESS_CACHE_TTL_MS,
    ...options,
  }
}

export async function getAccessibleGroupIds(user: User, yearFilter?: number, options?: ReadOptions) {
  if (user.role === 'ADMIN') {
    const groups = yearFilter
      ? await getDocumentsByField<Group>('groups', 'year', yearFilter, withAccessCache(options, `access-admin-groups-year-${yearFilter}`))
      : await listDocuments<Group>('groups', withAccessCache(options, 'access-admin-groups-all'))

    return groups.map((group) => group.id)
  }

  const assignments = await getDocumentsByField<UserGroup>('userGroups', 'userId', user.id, {
    ...withAccessCache(options, `access-user-groups-${user.id}`),
  })
  const allowedGroupIds = [...new Set(assignments.map((assignment) => assignment.groupId))]

  if (allowedGroupIds.length === 0) {
    return []
  }

  const groups = yearFilter
    ? await getDocumentsByField<Group>('groups', 'year', yearFilter, withAccessCache(options, `access-groups-year-${yearFilter}`))
    : await listDocuments<Group>('groups', withAccessCache(options, 'access-groups-all'))

  return groups
    .filter((group) => allowedGroupIds.includes(group.id) && (yearFilter ? group.year === yearFilter : true))
    .map((group) => group.id)
}

export async function getAccessibleGroups(user: User, yearFilter?: number, options?: ReadOptions) {
  if (user.role === 'ADMIN') {
    const groups = yearFilter
      ? await getDocumentsByField<Group>('groups', 'year', yearFilter, withAccessCache(options, `nav-admin-groups-year-${yearFilter}`))
      : await listDocuments<Group>('groups', withAccessCache(options, 'nav-admin-groups-all'))

    return groups
      .filter((group) => (yearFilter ? group.year === yearFilter : true))
      .sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es'))
  }

  const [groups, groupIds] = await Promise.all([
    yearFilter
      ? getDocumentsByField<Group>('groups', 'year', yearFilter, withAccessCache(options, `nav-groups-year-${yearFilter}`))
      : listDocuments<Group>('groups', withAccessCache(options, 'nav-groups-all')),
    getAccessibleGroupIds(user, yearFilter, options),
  ])

  return groups
    .filter((group) => groupIds.includes(group.id))
    .sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es'))
}

export async function canAccessGroup(user: User, groupId: string) {
  if (user.role === 'ADMIN') {
    return true
  }

  const assignments = await getDocumentsByField<UserGroup>('userGroups', 'userId', user.id, {
    cacheKey: `group-access-${user.id}`,
    maxAgeMs: ACCESS_CACHE_TTL_MS,
  })
  return assignments.some((assignment) => assignment.userId === user.id && assignment.groupId === groupId)
}

export async function canAccessStudent(user: User, studentId: string) {
  if (user.role === 'ADMIN') {
    return true
  }

  const student = await getDocumentById<Student>('students', studentId, { cacheKey: `student-access-${studentId}`, maxAgeMs: ACCESS_CACHE_TTL_MS })
  if (!student) {
    return false
  }

  return canAccessGroup(user, student.groupId)
}
