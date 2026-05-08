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
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-[0.95rem] border border-border/70 bg-white p-1">
      {options.map((option) => {
        const Icon = option.icon
        const active = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-[0.75rem] px-3 py-2 text-xs font-medium transition sm:text-sm',
              active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60',
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
