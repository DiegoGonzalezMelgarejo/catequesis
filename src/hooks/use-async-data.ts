import { useEffect, useState } from 'react'

import { useDataStore } from '@/store/data-store'

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const revision = useDataStore((state) => state.revision)
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)

      try {
        const nextData = await fetcher()

        if (active) {
          setData(nextData)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [revision, ...deps])

  return { data, loading }
}
