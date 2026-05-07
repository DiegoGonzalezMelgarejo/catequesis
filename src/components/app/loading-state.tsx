import { LoaderCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

type LoadingStateProps = {
  label?: string
  fullScreen?: boolean
}

export function LoadingState({ label = 'Cargando...', fullScreen = false }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-white/70 p-10 text-center',
        fullScreen && 'min-h-svh rounded-none border-0 bg-transparent',
      )}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
