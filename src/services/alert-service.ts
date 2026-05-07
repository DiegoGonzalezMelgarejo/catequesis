import { listDocuments } from '@/database/firestore-repository'
import { getAccessibleGroupIds } from '@/services/access-service'
import type { AlertItem, User } from '@/types/models'

export async function getAlertItems(user: User) {
  const accessibleGroupIds = await getAccessibleGroupIds(user)
  const [groups, userGroups, students, guardians, studentSacraments, attendanceSessions, attendanceRecords, activities, activityGrades] =
    await Promise.all([
      listDocuments<{ id: string; name: string }>('groups'),
      listDocuments<{ id: string; groupId: string }>('userGroups'),
      listDocuments<{ id: string; firstName: string; lastName: string; groupId: string; active: boolean }>('students'),
      listDocuments<{ id: string; studentId: string }>('guardians'),
      listDocuments<{ id: string; studentId: string }>('studentSacraments'),
      listDocuments<{ id: string; groupId: string }>('attendanceSessions'),
      listDocuments<{ id: string; sessionId: string; studentId: string; status: string }>('attendanceRecords'),
      listDocuments<{ id: string; groupId: string; title: string; active: boolean }>('activities'),
      listDocuments<{ id: string; activityId: string }>('activityGrades'),
    ])

  const visibleGroups = groups.filter(
    (group) => user.role === 'ADMIN' || accessibleGroupIds.includes(group.id),
  )
  const visibleGroupIds = visibleGroups.map((group) => group.id)
  const visibleStudents = students.filter((student) => visibleGroupIds.includes(student.groupId) && student.active)
  const alerts: AlertItem[] = []

  if (user.role === 'ADMIN') {
    visibleGroups
      .filter((group) => !userGroups.some((assignment) => assignment.groupId === group.id))
      .forEach((group) => {
        alerts.push({
          id: `group-without-catechist-${group.id}`,
          title: 'Grupo sin catequista',
          description: `${group.name} aun no tiene catequista asignado.`,
          severity: 'high',
          groupId: group.id,
          groupName: group.name,
        })
      })
  }

  visibleStudents.forEach((student) => {
    const studentName = `${student.firstName} ${student.lastName}`
    const groupName = visibleGroups.find((group) => group.id === student.groupId)?.name
    const studentGuardians = guardians.filter((guardian) => guardian.studentId === student.id)
    const studentSacramentsCount = studentSacraments.filter(
      (record) => record.studentId === student.id,
    ).length

    if (studentGuardians.length === 0) {
      alerts.push({
        id: `student-without-guardian-${student.id}`,
        title: 'Alumno sin acudiente',
        description: `${studentName} no tiene acudiente registrado.`,
        severity: 'high',
        groupId: student.groupId,
        groupName,
        studentId: student.id,
        studentName,
      })
    }

    if (studentSacramentsCount === 0) {
      alerts.push({
        id: `student-without-sacrament-${student.id}`,
        title: 'Alumno sin sacramento',
        description: `${studentName} no tiene sacramentos asociados.`,
        severity: 'medium',
        groupId: student.groupId,
        groupName,
        studentId: student.id,
        studentName,
      })
    }

    const absenceCount = attendanceRecords.filter((record) => {
      if (record.studentId !== student.id || record.status !== 'AUSENTE') {
        return false
      }

      const session = attendanceSessions.find((entry) => entry.id === record.sessionId)
      return Boolean(session && visibleGroupIds.includes(session.groupId))
    }).length

    if (absenceCount >= 3) {
      alerts.push({
        id: `student-many-absences-${student.id}`,
        title: 'Muchas faltas acumuladas',
        description: `${studentName} registra ${absenceCount} ausencias.`,
        severity: 'high',
        groupId: student.groupId,
        groupName,
        studentId: student.id,
        studentName,
      })
    }
  })

  visibleGroups.forEach((group) => {
    const activeStudents = visibleStudents.filter((student) => student.groupId === group.id)
    const groupActivities = activities.filter((activity) => activity.groupId === group.id && activity.active)

    groupActivities.forEach((activity) => {
      const gradeCount = activityGrades.filter((grade) => grade.activityId === activity.id).length
      if (activeStudents.length > 0 && gradeCount < activeStudents.length) {
        alerts.push({
          id: `pending-activity-${activity.id}`,
          title: 'Actividad pendiente',
          description: `${activity.title} aun no tiene notas completas.`,
          severity: 'low',
          groupId: group.id,
          groupName: group.name,
        })
      }
    })
  })

  const severityOrder = { high: 0, medium: 1, low: 2 }

  return alerts.sort((left, right) => {
    const severityDifference = severityOrder[left.severity] - severityOrder[right.severity]

    if (severityDifference !== 0) {
      return severityDifference
    }

    return `${left.groupName ?? ''}${left.studentName ?? ''}`.localeCompare(
      `${right.groupName ?? ''}${right.studentName ?? ''}`,
      'es',
    )
  })
}
