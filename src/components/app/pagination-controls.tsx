import { ChevronLeft, ChevronRight } from 'lucide-react'

import { SecondaryButton } from '@/components/app/secondary-button'

type PaginationControlsProps = {
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
  label?: string
  onNext: () => void
  onPrevious: () => void
}

export function PaginationControls({
  page,
  pageSize,
  hasNext,
  hasPrevious,
  label = 'Elementos',
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[1rem] border border-border/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">Pagina {page} • {pageSize} por carga</p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <SecondaryButton type="button" onClick={onPrevious} disabled={!hasPrevious}>
          <ChevronLeft className="size-4" />
          Anterior
        </SecondaryButton>
        <SecondaryButton type="button" onClick={onNext} disabled={!hasNext}>
          Siguiente
          <ChevronRight className="size-4" />
        </SecondaryButton>
      </div>
    </div>
  )
}
