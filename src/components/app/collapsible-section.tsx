import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { AppCard } from '@/components/app/app-card'
import { cn } from '@/utils/cn'

type CollapsibleSectionProps = {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  className,
  actions,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <AppCard className={className}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-[1rem] text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <span className="rounded-full bg-secondary p-2 text-muted-foreground">
            <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
          </span>
        </div>
      </button>

      {open ? <div className="mt-4 border-t border-border/60 pt-4">{children}</div> : null}
    </AppCard>
  )
}
