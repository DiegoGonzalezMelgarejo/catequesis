import { getDocumentsByFieldIn } from '@/database/firestore-repository'
import { getAccessibleGroups } from '@/services/access-service'
import type { AlertItem, User } from '@/types/models'

const ALERTS_CACHE_TTL_MS = 2 * 60 * 1000

export async function getAlertItems(user: User, yearFilter?: number) {
  const visibleGroups = await getAccessibleGroups(user, yearFilter)
  const visibleGroupIds = visibleGroups.map((group) => group.id)

  if (visibleGroupIds.length === 0) {
    return [] as AlertItem[]
  }

  const [userGroups, students, attendanceSessions, activities] = await Promise.all([
    getDocumentsByFieldIn<{ id: string; groupId: string }>('userGroups', 'groupId', visibleGroupIds, { cacheKey: `alerts-user-groups-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; firstName: string; lastName: string; groupId: string; active: boolean }>('students', 'groupId', visibleGroupIds, { cacheKey: `alerts-students-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; groupId: string }>('attendanceSessions', 'groupId', visibleGroupIds, { cacheKey: `alerts-sessions-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; groupId: string; title: string; active: boolean }>('activities', 'groupId', visibleGroupIds, { cacheKey: `alerts-activities-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS }),
  ])

  const visibleStudents = students.filter((student) => visibleGroupIds.includes(student.groupId) && student.active)
  const studentIds = visibleStudents.map((student) => student.id)
  const sessionIds = attendanceSessions.map((session) => session.id)
  const activityIds = activities.map((activity) => activity.id)

  const [guardians, studentSacraments, attendanceRecords, activityGrades] = await Promise.all([
    studentIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; studentId: string }>('guardians', 'studentId', studentIds, { cacheKey: `alerts-guardians-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS })
      : Promise.resolve([]),
    studentIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; studentId: string }>('studentSacraments', 'studentId', studentIds, { cacheKey: `alerts-student-sacraments-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS })
      : Promise.resolve([]),
    sessionIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; sessionId: string; studentId: string; status: string }>('attendanceRecords', 'sessionId', sessionIds, { cacheKey: `alerts-attendance-records-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS })
      : Promise.resolve([]),
    activityIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; activityId: string }>('activityGrades', 'activityId', activityIds, { cacheKey: `alerts-activity-grades-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: ALERTS_CACHE_TTL_MS })
      : Promise.resolve([]),
  ])

  const attendanceSessionMap = new Map(attendanceSessions.map((session) => [session.id, session]))
  const alerts: AlertItem[] = []

  if (user.role === 'ADMIN') {
    visibleGroups
      .filter((group) => !userGroups.some((assignment) => assignment.groupId === group.id))
      .forEach((group) => {
        alerts.push({
          id: `group-without-catechist-${group.id}`,
          title: 'Grupo sin catequista',
          description: `${group.name} aún no tiene catequista asignado.`,
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

      const session = attendanceSessionMap.get(record.sessionId)
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
          description: `${activity.title} aún no tiene notas completas.`,
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
