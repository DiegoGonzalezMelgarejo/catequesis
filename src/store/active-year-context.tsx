import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/use-auth'
import { createAnnualPeriod, getAvailableWorkYears } from '@/services/annual-period-service'
import { finishBootstrapStage, setBootstrapStage } from '@/store/bootstrap-store'
import { useDataStore } from '@/store/data-store'
import { formatYearLabel } from '@/utils/year'

type ActiveYearContextValue = {
  activeYear: number | null
  availableYears: number[]
  loading: boolean
  yearJustChanged: boolean
  setActiveYear: (year: number) => void
  createYearPeriod: (input: { year: number; observations?: string }) => Promise<void>
  clearActiveYear: () => void
  refreshYears: () => Promise<void>
}

export const ActiveYearContext = createContext<ActiveYearContextValue | null>(null)

type ActiveYearProviderProps = {
  children: React.ReactNode
}

function getStorageKey(userId: string) {
  return `active-work-year:${userId}`
}

function clearYearSensitiveUiCache() {
  if (typeof window === 'undefined') {
    return
  }

  ;[
    'students-view-mode',
    'groups-view-mode',
    'catechists-view-mode',
    'group-detail-students-view-mode',
  ].forEach((key) => window.localStorage.removeItem(key))
}

export function ActiveYearProvider({ children }: ActiveYearProviderProps) {
  const { user } = useAuth()
  const revision = useDataStore((state) => state.revision)
  const [activeYear, setActiveYearState] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [yearJustChanged, setYearJustChanged] = useState(false)
  const changeTimeoutRef = useRef<number | null>(null)
  const bootstrapFinishTimeoutRef = useRef<number | null>(null)

  function scheduleBootstrapFinish() {
    if (bootstrapFinishTimeoutRef.current != null) {
      window.clearTimeout(bootstrapFinishTimeoutRef.current)
    }

    bootstrapFinishTimeoutRef.current = window.setTimeout(() => {
      finishBootstrapStage()
      bootstrapFinishTimeoutRef.current = null
    }, 220)
  }

  function activateYear(year: number, validYears = availableYears) {
    if (!validYears.includes(year)) {
      toast.error('Ese corte anual no existe todavía. Créalo primero.')
      return
    }

    setActiveYearState((current) => {
      if (current === year) {
        return current
      }

      toast.success(`Ahora estas trabajando en ${formatYearLabel(year)}.`)
      setYearJustChanged(true)
      clearYearSensitiveUiCache()

      if (changeTimeoutRef.current != null) {
        window.clearTimeout(changeTimeoutRef.current)
      }

      changeTimeoutRef.current = window.setTimeout(() => {
        setYearJustChanged(false)
      }, 4500)

      return year
    })
  }

  async function refreshYears() {
    if (!user) {
      setAvailableYears([])
      setActiveYearState(null)
      return
    }

    setLoading(true)
    setBootstrapStage('periods')
    let resolvedActiveYear: number | null = null

    try {
      const finalYears = await getAvailableWorkYears({ source: 'server-first' })
      setAvailableYears(finalYears)

      const storageKey = getStorageKey(user.id)
      const storedYear = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
      const parsedStoredYear = storedYear ? Number(storedYear) : null

      resolvedActiveYear = activeYear && finalYears.includes(activeYear)
        ? activeYear
        : parsedStoredYear && Number.isFinite(parsedStoredYear) && finalYears.includes(parsedStoredYear)
          ? parsedStoredYear
          : null

      setActiveYearState(resolvedActiveYear)
    } finally {
      setLoading(false)

      if (resolvedActiveYear != null) {
        setBootstrapStage('panel')
        scheduleBootstrapFinish()
      } else {
        finishBootstrapStage()
      }
    }
  }

  useEffect(() => {
    if (!user) {
      setAvailableYears([])
      setActiveYearState(null)
      return
    }

    void refreshYears()
  }, [revision, user?.id])

  useEffect(() => {
    if (!user || activeYear == null || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(getStorageKey(user.id), activeYear.toString())
  }, [activeYear, user])

  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current != null) {
        window.clearTimeout(changeTimeoutRef.current)
      }

      if (bootstrapFinishTimeoutRef.current != null) {
        window.clearTimeout(bootstrapFinishTimeoutRef.current)
      }
    }
  }, [])

  const value = useMemo<ActiveYearContextValue>(
    () => ({
      activeYear,
      availableYears,
      loading,
      yearJustChanged,
      setActiveYear: activateYear,
      createYearPeriod: async ({ year, observations }) => {
        const period = await createAnnualPeriod({ year, observations })
        const nextYears = await getAvailableWorkYears({ source: 'server-first' })
        setAvailableYears(nextYears)
        activateYear(period.year, nextYears)
      },
      clearActiveYear: () => {
        setYearJustChanged(false)
        setActiveYearState(null)
      },
      refreshYears,
    }),
    [activeYear, availableYears, loading, yearJustChanged],
  )

  return <ActiveYearContext.Provider value={value}>{children}</ActiveYearContext.Provider>
}
