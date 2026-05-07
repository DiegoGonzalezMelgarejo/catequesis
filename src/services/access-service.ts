import { getDocumentById, listDocuments } from '@/database/firestore-repository'
import type { Group, Student, User, UserGroup } from '@/types/models'

export async function getAccessibleGroupIds(user: User) {
  if (user.role === 'ADMIN') {
    const groups = await listDocuments<Group>('groups')
    return groups.map((group) => group.id)
  }

  const assignments = (await listDocuments<UserGroup>('userGroups')).filter(
    (assignment) => assignment.userId === user.id,
  )
  return [...new Set(assignments.map((assignment) => assignment.groupId))]
}

export async function getAccessibleGroups(user: User) {
  const groups = await listDocuments<Group>('groups')
  const groupIds = await getAccessibleGroupIds(user)

  if (user.role === 'ADMIN') {
    return groups
  }

  return groups.filter((group) => groupIds.includes(group.id))
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
