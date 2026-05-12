import { getDocumentById, listDocuments } from '@/database/firestore-repository'
import type { Group, Student, User, UserGroup } from '@/types/models'

export async function getAccessibleGroupIds(user: User, yearFilter?: number) {
  const groups = await listDocuments<Group>('groups')

  if (user.role === 'ADMIN') {
    return groups
      .filter((group) => (yearFilter ? group.year === yearFilter : true))
      .map((group) => group.id)
  }

  const assignments = (await listDocuments<UserGroup>('userGroups')).filter(
    (assignment) => assignment.userId === user.id,
  )
  const allowedGroupIds = [...new Set(assignments.map((assignment) => assignment.groupId))]

  return groups
    .filter((group) => allowedGroupIds.includes(group.id) && (yearFilter ? group.year === yearFilter : true))
    .map((group) => group.id)
}

export async function getAccessibleGroups(user: User, yearFilter?: number) {
  const groups = await listDocuments<Group>('groups')
  const groupIds = await getAccessibleGroupIds(user, yearFilter)

  if (user.role === 'ADMIN') {
    return groups
      .filter((group) => (yearFilter ? group.year === yearFilter : true))
      .sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es'))
  }

  return groups
    .filter((group) => groupIds.includes(group.id))
    .sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, 'es'))
}

export async function canAccessGroup(user: User, groupId: string) {
  if (user.role === 'ADMIN') {
    return true
  }

  const assignments = await listDocuments<UserGroup>('userGroups')
  return assignments.some((assignment) => assignment.userId === user.id && assignment.groupId === groupId)
}

export async function canAccessStudent(user: User, studentId: string) {
  if (user.role === 'ADMIN') {
    return true
  }

  const student = await getDocumentById<Student>('students', studentId)
  if (!student) {
    return false
  }

  return canAccessGroup(user, student.groupId)
}
