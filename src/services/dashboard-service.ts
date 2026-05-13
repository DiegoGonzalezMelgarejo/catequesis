import { getDocumentsByField, getDocumentsByFieldIn, type ReadOptions } from '@/database/firestore-repository'
import { getActivityOverviews } from '@/services/activity-service'
import { getAlertItems } from '@/services/alert-service'
import type { Group, User } from '@/types/models'

const DASHBOARD_CACHE_TTL_MS = 3 * 60 * 1000

type DashboardGroup = Group

function withDashboardCache(options: ReadOptions | undefined, cacheKey: string): ReadOptions {
  return {
    cacheKey,
    maxAgeMs: DASHBOARD_CACHE_TTL_MS,
    ...options,
  }
}

export type DashboardAdminSummary = {
  role: 'ADMIN'
  totalCatechists: number
  totalGroups: number
  totalStudents: number
  groupsWithoutCatechist: number
}

export type DashboardCatechistSummary = {
  role: 'CATECHIST'
  totalStudents: number
}

export type DashboardSummary = DashboardAdminSummary | DashboardCatechistSummary

export function getDashboardSnapshotKey(user: User, yearFilter?: number) {
  return `dashboard-snapshot:${user.id}:${yearFilter ?? 'all'}`
}

export function loadDashboardSnapshot(user: User, yearFilter?: number) {
  if (typeof window === 'undefined') {
    return null
  }

  const rawSnapshot = window.localStorage.getItem(getDashboardSnapshotKey(user, yearFilter))

  if (!rawSnapshot) {
    return null
  }

  try {
    return JSON.parse(rawSnapshot) as {
      summary?: DashboardSummary
      alerts?: Awaited<ReturnType<typeof getAlertItems>>
      activities?: Awaited<ReturnType<typeof getActivityOverviews>>
      latestAttendance?: { id: string; groupId: string; date: string; updatedAt: string }
    }
  } catch {
    return null
  }
}

export function saveDashboardSnapshot(
  user: User,
  yearFilter: number | undefined,
  snapshot: {
    summary?: DashboardSummary
    alerts?: Awaited<ReturnType<typeof getAlertItems>>
    activities?: Awaited<ReturnType<typeof getActivityOverviews>>
    latestAttendance?: { id: string; groupId: string; date: string; updatedAt: string }
  },
) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getDashboardSnapshotKey(user, yearFilter), JSON.stringify(snapshot))
}

export async function getDashboardSummaryData(user: User, groups: DashboardGroup[], yearFilter?: number, options?: ReadOptions): Promise<DashboardSummary> {
  const groupIds = groups.map((group) => group.id)
  const students = groupIds.length > 0
    ? await getDocumentsByFieldIn<{ id: string; groupId: string; active: boolean }>(
      'students',
      'groupId',
      groupIds,
      withDashboardCache(options, `dashboard-students-${user.role}-${yearFilter ?? 'all'}`),
    )
    : []

  if (user.role !== 'ADMIN') {
    return {
      role: 'CATECHIST',
      totalStudents: students.filter((student) => student.active).length,
    }
  }

  const [catechists, userGroups] = await Promise.all([
    getDocumentsByField<{ id: string; role: string; active: boolean }>('users', 'role', 'CATECHIST', withDashboardCache(options, 'dashboard-catechists')),
    groupIds.length > 0
      ? getDocumentsByFieldIn<{ id: string; groupId: string }>('userGroups', 'groupId', groupIds, withDashboardCache(options, `dashboard-user-groups-${yearFilter ?? 'all'}`))
      : Promise.resolve([]),
  ])

  return {
    role: 'ADMIN',
    totalCatechists: catechists.filter((catechist) => catechist.active).length,
    totalGroups: groups.length,
    totalStudents: students.filter((student) => student.active).length,
    groupsWithoutCatechist: groups.filter(
      (group) => !userGroups.some((assignment) => assignment.groupId === group.id),
    ).length,
  }
}

export async function getDashboardAlertsData(user: User, yearFilter?: number) {
  return getAlertItems(user, yearFilter)
}

export async function getDashboardActivitiesData(user: User, yearFilter?: number) {
  return getActivityOverviews(user, undefined, yearFilter)
}

export async function getDashboardAttendanceData(groups: DashboardGroup[], user: User, yearFilter?: number, options?: ReadOptions) {
  const groupIds = groups.map((group) => group.id)

  if (groupIds.length === 0) {
    return undefined
  }

  const attendanceSessions = await getDocumentsByFieldIn<{ id: string; groupId: string; date: string; updatedAt: string }>(
    'attendanceSessions',
    'groupId',
    groupIds,
    withDashboardCache(options, `dashboard-attendance-${user.role}-${yearFilter ?? 'all'}`),
  )

  return attendanceSessions.sort((left, right) => right.date.localeCompare(left.date))[0]
}
