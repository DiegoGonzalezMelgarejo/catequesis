import { useContext } from 'react'

import { ActiveYearContext } from '@/store/active-year-context'

export function useActiveYear() {
  const context = useContext(ActiveYearContext)

  if (!context) {
    throw new Error('useActiveYear debe usarse dentro de ActiveYearProvider')
  }

  return context
}
