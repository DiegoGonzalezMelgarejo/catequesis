import { listDocuments } from '@/database/firestore-repository'
import { getGroupOverviews } from '@/services/group-service'
import type { User } from '@/types/models'

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
  const [groupOverviews, attendanceSessions, attendanceRecords, activityGrades, activities] = await Promise.all([
    getGroupOverviews(user, yearFilter),
    listDocuments<{ id: string; groupId: string }>('attendanceSessions'),
    listDocuments<{ id: string; sessionId: string; status: string }>('attendanceRecords'),
    listDocuments<{ id: string; activityId: string; grade: number }>('activityGrades'),
    listDocuments<{ id: string; groupId: string }>('activities'),
  ])

  const rows = groupOverviews.map((group) => {
    const sessionIds = attendanceSessions
      .filter((session) => session.groupId === group.id)
      .map((session) => session.id)
    const groupRecords = attendanceRecords.filter((record) => sessionIds.includes(record.sessionId))
    const positiveAttendance = groupRecords.filter(
      (record) => record.status === 'PRESENTE' || record.status === 'JUSTIFICADO',
    ).length
    const attendanceRate = groupRecords.length > 0 ? (positiveAttendance / groupRecords.length) * 100 : 0
    const groupActivityIds = activities.filter((activity) => activity.groupId === group.id).map((activity) => activity.id)
    const grades = activityGrades.filter((grade) => groupActivityIds.includes(grade.activityId))
    const averageGrade =
      grades.length > 0
        ? grades.reduce((accumulator, grade) => accumulator + grade.grade, 0) / grades.length
        : 0

    return {
      groupId: group.id,
      groupName: group.name,
      catechists: group.catechists.join(', ') || 'Sin asignar',
      students: group.studentCount,
      attendanceRate,
      averageGrade,
      pendingActivities: group.pendingActivities,
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
