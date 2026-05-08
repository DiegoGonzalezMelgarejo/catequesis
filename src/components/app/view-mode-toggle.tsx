import { LayoutGrid, List, Table2 } from 'lucide-react'

import { cn } from '@/utils/cn'

export type ViewMode = 'cards' | 'list' | 'table'

type ViewModeToggleProps = {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

const options: Array<{ value: ViewMode; label: string; icon: typeof LayoutGrid }> = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'list', label: 'Lista', icon: List },
  { value: 'table', label: 'Tabla', icon: Table2 },
]

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-white/85 p-1 shadow-sm">
      {options.map((option) => {
        const Icon = option.icon
        const active = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm',
              active ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-secondary/60',
            )}
            onClick={() => onChange(option.value)}
          >
            <Icon className="size-4" />
            <span>{option.label}</span>
          </button>
        )}
      )}
    </div>
  )
}
