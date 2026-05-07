import { useEffect, useState } from 'react'

import { useDataStore } from '@/store/data-store'

type PaginatedResponse<T, TCursor> = {
  items: T[]
  nextCursor: TCursor | null
  hasMore: boolean
}

type UsePaginatedResourceOptions<TCursor> = {
  pageSize?: number
  deps?: unknown[]
  fetchPage: (
    cursor: TCursor | null,
    pageSize: number,
  ) => Promise<PaginatedResponse<unknown, TCursor>>
}

export function usePaginatedResource<TItem, TCursor>({
  pageSize = 20,
  deps = [],
  fetchPage,
}: UsePaginatedResourceOptions<TCursor>) {
  const revision = useDataStore((state) => state.revision)
  const [items, setItems] = useState<TItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [cursorHistory, setCursorHistory] = useState<Array<TCursor | null>>([null])
  const [nextCursor, setNextCursor] = useState<TCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    setPage(1)
    setCursorHistory([null])
    setNextCursor(null)
    setHasMore(false)
  }, deps)

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)

      try {
        const response = (await fetchPage(cursorHistory[page - 1] ?? null, pageSize)) as PaginatedResponse<
          TItem,
          TCursor
        >

        if (!active) {
          return
        }

        setItems(response.items)
        setNextCursor(response.nextCursor)
        setHasMore(response.hasMore)
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
  }, [cursorHistory, fetchPage, page, pageSize, revision])

  return {
    items,
    loading,
    page,
    pageSize,
    hasNext: hasMore,
    hasPrevious: page > 1,
    goNext: () => {
      if (!hasMore || !nextCursor) {
        return
      }

      setCursorHistory((current) => {
        if (current[page] != null) {
          return current
        }

        return [...current, nextCursor]
      })
      setPage((current) => current + 1)
    },
    goPrevious: () => {
      if (page === 1) {
        return
      }

      setPage((current) => current - 1)
    },
  }
}
