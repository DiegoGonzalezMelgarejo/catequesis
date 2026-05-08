import { Link, useSearchParams } from 'react-router-dom'

import { SecondaryButton } from '@/components/app/secondary-button'
import { AttendanceSessionForm } from '@/features/attendance/attendance-session-form'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'

export function AttendanceSessionPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')
  const { backLabel, backTo } = useBackNavigation(groupId ? `/app/attendance?groupId=${groupId}` : '/app/attendance', 'Volver al histórico')

  if (!user) {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        <SecondaryButton asChild>
          <Link to={backTo}>{backLabel}</Link>
        </SecondaryButton>
      </div>
      <AttendanceSessionForm
        user={user}
        initialGroupId={groupId}
        initialDate={searchParams.get('date')}
        mode={searchParams.get('mode') === 'edit' ? 'edit' : 'new'}
      />
    </div>
  )
}
