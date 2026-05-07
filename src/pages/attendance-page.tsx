import { useSearchParams } from 'react-router-dom'

import { AttendanceHistory } from '@/features/attendance/attendance-history'
import { useAuth } from '@/hooks/use-auth'

export function AttendancePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  if (!user) {
    return null
  }

  return (
    <AttendanceHistory
      user={user}
      initialGroupId={searchParams.get('groupId')}
    />
  )
}
