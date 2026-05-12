import { getDocumentsByField, getDocumentsByFieldIn } from '@/database/firestore-repository'
import { getActivityOverviews } from '@/services/activity-service'
import { getAlertItems } from '@/services/alert-service'
import { getAccessibleGroups } from '@/services/access-service'
import type { User } from '@/types/models'

const DASHBOARD_CACHE_TTL_MS = 3 * 60 * 1000

export async function getDashboardData(user: User, yearFilter?: number) {
  const groups = await getAccessibleGroups(user, yearFilter)
  const groupIds = groups.map((group) => group.id)

  const [students, alerts, activities, attendanceSessions] = await Promise.all([
    groupIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>('students', 'groupId', groupIds, { cacheKey: `dashboard-students-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: DASHBOARD_CACHE_TTL_MS })
      : Promise.resolve([]),
    getAlertItems(user, yearFilter),
    getActivityOverviews(user, undefined, yearFilter),
    groupIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; groupId: string; date: string; updatedAt: string }>('attendanceSessions', 'groupId', groupIds, { cacheKey: `dashboard-attendance-${user.role}-${yearFilter ?? 'all'}`, maxAgeMs: DASHBOARD_CACHE_TTL_MS })
      : Promise.resolve([]),
  ])

  if (user.role === 'ADMIN') {
    const [catechists, userGroups] = await Promise.all([
      getDocumentsByField<{ id: string; role: string; active: boolean }>('users', 'role', 'CATECHIST', {
        cacheKey: 'dashboard-catechists',
        maxAgeMs: DASHBOARD_CACHE_TTL_MS,
      }),
      groupIds.length > 0
        ? getDocumentsByFieldIn<{ id: string; groupId: string }>('userGroups', 'groupId', groupIds, { cacheKey: `dashboard-user-groups-${yearFilter ?? 'all'}`, maxAgeMs: DASHBOARD_CACHE_TTL_MS })
        : Promise.resolve([]),
    ])

    const groupsWithoutCatechist = groups.filter(
      (group) => !userGroups.some((assignment) => assignment.groupId === group.id),
    ).length

    return {
      role: 'ADMIN' as const,
      totalCatechists: catechists.filter((catechist) => catechist.active).length,
      totalGroups: groups.length,
      totalStudents: students.filter((student) => student.active).length,
      groupsWithoutCatechist,
      recentGroups: groups.slice(0, 4),
      recentAlerts: alerts.slice(0, 5),
      upcomingActivities: activities
        .filter((activity) => activity.active && activity.date >= new Date().toISOString().slice(0, 10))
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
