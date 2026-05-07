import { listDocuments } from '@/database/firestore-repository'
import { getActivityOverviews } from '@/services/activity-service'
import { getAlertItems } from '@/services/alert-service'
import { getGroupOverviews } from '@/services/group-service'
import { getStudentOverviews } from '@/services/student-service'
import { getCatechistOverviews } from '@/services/user-service'
import type { User } from '@/types/models'

export async function getDashboardData(user: User) {
  const [groups, students, alerts, activities, attendanceSessions] = await Promise.all([
    getGroupOverviews(user),
    getStudentOverviews(user),
    getAlertItems(user),
    getActivityOverviews(user),
    listDocuments<{ id: string; groupId: string; date: string; updatedAt: string }>('attendanceSessions'),
  ])

  if (user.role === 'ADMIN') {
    const catechists = await getCatechistOverviews()

    return {
      role: 'ADMIN' as const,
      totalCatechists: catechists.filter((catechist) => catechist.active).length,
      totalGroups: groups.length,
      totalStudents: students.filter((student) => student.active).length,
      groupsWithoutCatechist: groups.filter((group) => group.catechists.length === 0).length,
      recentGroups: groups.slice(0, 4),
      recentAlerts: alerts.slice(0, 5),
      upcomingActivities: activities
        .filter((activity) => activity.date >= new Date().toISOString().slice(0, 10))
        .slice(0, 5),
      latestAttendance: attendanceSessions.sort((left, right) => right.date.localeCompare(left.date))[0],
    }
  }

  const ownGroups = groups.filter((group) => group.active)
  const totalStudents = students.filter((student) => student.active).length

  return {
    role: 'CATECHIST' as const,
    groups: ownGroups,
    totalStudents,
    recentAlerts: alerts.slice(0, 5),
    latestAttendance: attendanceSessions
      .filter((session) => ownGroups.some((group) => group.id === session.groupId))
      .sort((left, right) => right.date.localeCompare(left.date))[0],
    upcomingActivities: activities
      .filter((activity) => activity.date >= new Date().toISOString().slice(0, 10))
      .slice(0, 5),
  }
}
