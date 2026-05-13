import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

type LoadingStateProps = {
  label?: string
  fullScreen?: boolean
  details?: readonly string[]
  revealIntervalMs?: number
}

export function LoadingState({
  label = 'Cargando...',
  fullScreen = false,
  details = [],
  revealIntervalMs = 1200,
}: LoadingStateProps) {
  const [visibleDetails, setVisibleDetails] = useState(details.length > 0 ? 1 : 0)

  useEffect(() => {
    setVisibleDetails(details.length > 0 ? 1 : 0)

    if (details.length <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setVisibleDetails((current) => {
        if (current >= details.length) {
          window.clearInterval(intervalId)
          return current
        }

        return current + 1
      })
    }, revealIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [details, revealIntervalMs])

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-white/70 p-10 text-center',
        fullScreen && 'min-h-svh rounded-none border-0 bg-transparent',
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" />
        <p className="text-sm font-medium">{label}</p>
        {details.length > 0 ? (
          <div className="w-full space-y-2 text-left">
            {details.slice(0, visibleDetails).map((detail, index) => {
              const isLatest = index === visibleDetails - 1

              return (
                <p
                  key={`${detail}-${index}`}
                  className={cn('rounded-[0.9rem] bg-white/70 px-3 py-2 text-xs shadow-sm transition', isLatest && 'border border-primary/15 text-foreground')}
                >
                  {detail}
                </p>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
