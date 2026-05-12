import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { PageSkeleton } from '@/components/app/page-skeleton'
import { AppLayout } from '@/layouts/app-layout'
import { ProtectedRoute } from '@/routes/protected-route'
import { PublicRoute } from '@/routes/public-route'

const LoginPage = lazy(async () => ({ default: (await import('@/pages/login-page')).LoginPage }))
const DashboardPage = lazy(async () => ({ default: (await import('@/pages/dashboard-page')).DashboardPage }))
const ParishesPage = lazy(async () => ({ default: (await import('@/pages/parishes-page')).ParishesPage }))
const CatechistsPage = lazy(async () => ({ default: (await import('@/pages/catechists-page')).CatechistsPage }))
const CatechistDetailPage = lazy(async () => ({ default: (await import('@/pages/catechist-detail-page')).CatechistDetailPage }))
const GroupsPage = lazy(async () => ({ default: (await import('@/pages/groups-page')).GroupsPage }))
const GroupDetailPage = lazy(async () => ({ default: (await import('@/pages/group-detail-page')).GroupDetailPage }))
const StudentsPage = lazy(async () => ({ default: (await import('@/pages/students-page')).StudentsPage }))
const StudentHistoryPage = lazy(async () => ({ default: (await import('@/pages/student-history-page')).StudentHistoryPage }))
const AttendancePage = lazy(async () => ({ default: (await import('@/pages/attendance-page')).AttendancePage }))
const AttendanceSessionPage = lazy(async () => ({ default: (await import('@/pages/attendance-session-page')).AttendanceSessionPage }))
const ActivitiesPage = lazy(async () => ({ default: (await import('@/pages/activities-page')).ActivitiesPage }))
const MorePage = lazy(async () => ({ default: (await import('@/pages/more-page')).MorePage }))
const ChecklistsPage = lazy(async () => ({ default: (await import('@/pages/checklists-page')).ChecklistsPage }))
const DocumentsPage = lazy(async () => ({ default: (await import('@/pages/documents-page')).DocumentsPage }))
const ReportsPage = lazy(async () => ({ default: (await import('@/pages/reports-page')).ReportsPage }))
const AlertsPage = lazy(async () => ({ default: (await import('@/pages/alerts-page')).AlertsPage }))

type SuspensePageProps = {
  children: React.ReactNode
  variant?: 'dashboard' | 'list' | 'detail'
}

function SuspensePage({ children, variant = 'list' }: SuspensePageProps) {
  return <Suspense fallback={<PageSkeleton variant={variant} />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <SuspensePage variant="detail">
                <LoginPage />
              </SuspensePage>
            </PublicRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuspensePage variant="dashboard"><DashboardPage /></SuspensePage>} />
          <Route path="parishes" element={<SuspensePage variant="list"><ParishesPage /></SuspensePage>} />
          <Route path="catechists" element={<SuspensePage variant="list"><CatechistsPage /></SuspensePage>} />
          <Route path="catechists/:catechistId" element={<SuspensePage variant="detail"><CatechistDetailPage /></SuspensePage>} />
          <Route path="groups" element={<SuspensePage variant="list"><GroupsPage /></SuspensePage>} />
          <Route path="groups/:groupId" element={<SuspensePage variant="detail"><GroupDetailPage /></SuspensePage>} />
          <Route path="students" element={<SuspensePage variant="list"><StudentsPage /></SuspensePage>} />
          <Route path="students/:studentId" element={<SuspensePage variant="detail"><StudentHistoryPage /></SuspensePage>} />
          <Route path="attendance" element={<SuspensePage variant="detail"><AttendancePage /></SuspensePage>} />
          <Route path="attendance/session" element={<SuspensePage variant="detail"><AttendanceSessionPage /></SuspensePage>} />
          <Route path="activities" element={<SuspensePage variant="list"><ActivitiesPage /></SuspensePage>} />
          <Route path="more" element={<SuspensePage variant="list"><MorePage /></SuspensePage>} />
          <Route path="checklists" element={<SuspensePage variant="list"><ChecklistsPage /></SuspensePage>} />
          <Route path="documents" element={<SuspensePage variant="list"><DocumentsPage /></SuspensePage>} />
          <Route path="reports" element={<SuspensePage variant="dashboard"><ReportsPage /></SuspensePage>} />
          <Route path="alerts" element={<SuspensePage variant="list"><AlertsPage /></SuspensePage>} />
        </Route>

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
