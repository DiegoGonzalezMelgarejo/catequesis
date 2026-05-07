import { useSearchParams } from 'react-router-dom'

import { AttendanceSessionForm } from '@/features/attendance/attendance-session-form'
import { useAuth } from '@/hooks/use-auth'

export function AttendanceSessionPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  if (!user) {
    return null
  }

  return (
    <AttendanceSessionForm
      user={user}
      initialGroupId={searchParams.get('groupId')}
      initialDate={searchParams.get('date')}
      mode={searchParams.get('mode') === 'edit' ? 'edit' : 'new'}
    />
  )
}
