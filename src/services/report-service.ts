import { getDocumentsByFieldIn } from '@/database/firestore-repository'
import { getAccessibleGroups } from '@/services/access-service'
import { getDocumentsByField } from '@/database/firestore-repository'
import type { User } from '@/types/models'

const REPORTS_CACHE_TTL_MS = 5 * 60 * 1000

export type ReportRow = {
  groupId: string
  groupName: string
  catechists: string
  students: number
  attendanceRate: number
  averageGrade: number
  pendingActivities: number
}

export type ReportData = {
  rows: ReportRow[]
  overallAttendanceRate: number
  overallAverageGrade: number
  totalPendingActivities: number
  totalGroups: number
  totalStudents: number
}

export async function getReportData(user: User, yearFilter?: number) {
  const groups = await getAccessibleGroups(user, yearFilter)
  const groupIds = groups.map((group) => group.id)

  if (groupIds.length === 0) {
    return {
      rows: [],
      overallAttendanceRate: 0,
      overallAverageGrade: 0,
      totalPendingActivities: 0,
      totalGroups: 0,
      totalStudents: 0,
    } satisfies ReportData
  }

  const [userGroups, users, students, attendanceSessions, activities] = await Promise.all([
    getDocumentsByFieldIn<{ id: string; userId: string; groupId: string }>('userGroups', 'groupId', groupIds, { cacheKey: `reports-user-groups-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS }),
    getDocumentsByField<{ id: string; fullName: string; role: string }>('users', 'role', 'CATECHIST', { cacheKey: 'reports-catechists', maxAgeMs: REPORTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('students', 'groupId', groupIds, { cacheKey: `reports-students-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; groupId: string }>('attendanceSessions', 'groupId', groupIds, { cacheKey: `reports-sessions-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS }),
    getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('activities', 'groupId', groupIds, { cacheKey: `reports-activities-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS }),
  ])

  const sessionIds = attendanceSessions.map((session) => session.id)
  const activityIds = activities.map((activity) => activity.id)

  const [attendanceRecords, activityGrades] = await Promise.all([
    sessionIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; sessionId: string; status: string }>('attendanceRecords', 'sessionId', sessionIds, { cacheKey: `reports-attendance-records-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS })
      : Promise.resolve([]),
    activityIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; activityId: string; grade: number }>('activityGrades', 'activityId', activityIds, { cacheKey: `reports-activity-grades-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: REPORTS_CACHE_TTL_MS })
      : Promise.resolve([]),
  ])

  const catechistMap = new Map(users.map((user) => [user.id, user.fullName]))
  const sessionsByGroup = new Map<string, string[]>()
  const activitiesByGroup = new Map<string, string[]>()
  const activeStudentsByGroup = new Map<string, number>()

  attendanceSessions.forEach((session) => {
    sessionsByGroup.set(session.groupId, [...(sessionsByGroup.get(session.groupId) ?? []), session.id])
  })

  activities.forEach((activity) => {
    activitiesByGroup.set(activity.groupId, [...(activitiesByGroup.get(activity.groupId) ?? []), activity.id])
  })

  students.forEach((student) => {
    if (!student.active) {
      return
    }

    activeStudentsByGroup.set(student.groupId, (activeStudentsByGroup.get(student.groupId) ?? 0) + 1)
  })

  const rows = groups.map((group) => {
    const sessionIdsForGroup = sessionsByGroup.get(group.id) ?? []
    const groupRecords = attendanceRecords.filter((record) => sessionIdsForGroup.includes(record.sessionId))
    const positiveAttendance = groupRecords.filter(
      (record) => record.status === 'PRESENTE' || record.status === 'JUSTIFICADO',
    ).length
    const attendanceRate = groupRecords.length > 0 ? (positiveAttendance / groupRecords.length) * 100 : 0
    const groupActivityIds = activitiesByGroup.get(group.id) ?? []
    const grades = activityGrades.filter((grade) => groupActivityIds.includes(grade.activityId))
    const averageGrade =
      grades.length > 0
        ? grades.reduce((accumulator, grade) => accumulator + grade.grade, 0) / grades.length
        : 0
    const assignedCatechists = userGroups
      .filter((assignment) => assignment.groupId === group.id)
      .map((assignment) => catechistMap.get(assignment.userId))
      .filter(Boolean)
    const activeStudents = activeStudentsByGroup.get(group.id) ?? 0
    const activeActivities = activities.filter((activity) => activity.groupId === group.id && activity.active)
    const pendingActivities = activeActivities.filter((activity) => {
      const gradeCount = activityGrades.filter((grade) => grade.activityId === activity.id).length
      return activeStudents > 0 && gradeCount < activeStudents
    }).length

    return {
      groupId: group.id,
      groupName: group.name,
      catechists: assignedCatechists.join(', ') || 'Sin asignar',
      students: activeStudents,
      attendanceRate,
      averageGrade,
      pendingActivities,
    }
  })

  const totalAttendanceRecords = rows.reduce((accumulator, row) => accumulator + row.students, 0)
  const overallAttendanceRate =
    rows.length > 0
      ? rows.reduce((accumulator, row) => accumulator + row.attendanceRate, 0) / rows.length
      : 0
  const overallAverageGrade =
    rows.length > 0 ? rows.reduce((accumulator, row) => accumulator + row.averageGrade, 0) / rows.length : 0

  return {
    rows,
    overallAttendanceRate,
    overallAverageGrade,
    totalPendingActivities: rows.reduce((accumulator, row) => accumulator + row.pendingActivities, 0),
    totalGroups: rows.length,
    totalStudents: totalAttendanceRecords,
  } satisfies ReportData
}
