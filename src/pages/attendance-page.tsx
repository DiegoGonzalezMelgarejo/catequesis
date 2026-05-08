import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { SecondaryButton } from '@/components/app/secondary-button'
import { AttendanceHistory } from '@/features/attendance/attendance-history'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'

export function AttendancePage() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')
  const { backLabel, backTo } = useBackNavigation('/app/dashboard', 'Volver al panel')

  if (!user) {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {(location.state as { from?: string } | null)?.from ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          <SecondaryButton asChild>
            <Link to={backTo}>{backLabel}</Link>
          </SecondaryButton>
        </div>
      ) : null}
      <AttendanceHistory user={user} initialGroupId={groupId} />
    </div>
  )
}
